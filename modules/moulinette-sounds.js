import { MoulinetteBBCClient } from "./moulinette-bbc-client.js"
import { MoulinetteFavorite } from "./moulinette-favorite.js"

/**
 * Forge Module for sounds
 */
export class MoulinetteSounds extends game.moulinette.applications.MoulinetteForgeModule {

  static FOLDER_CUSTOM_SOUNDS   = "/moulinette/sounds/custom"
  
  static MOULINETTE_SOUNDBOARD  = "Moulinette Soundboard"
  static MOULINETTE_PLAYLIST    = "Moulinette Playlist"
  
  constructor() {
    super()
  }
  
  /**
   * Returns the list of available packs
   */
  async getPackList() {
    const bbc = [{ special: "bbc", publisher: "BBC", name: "Sounds Effects (bbc.co.uk – © copyright 2021 BBC)", pubWebsite: "https://www.bbc.co.uk", url: "https://sound-effects.bbcrewind.co.uk", "license": "check website", isRemote: true }]
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex(["moulinette/sounds/custom/index.json"], bbc)
    this.assets = index.assets
    this.assetsPacks = index.packs
    return duplicate(this.assetsPacks)
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, pack) {
    let assets = []
    
    // pack must be selected or terms provided
    if((!pack || pack < 0) && (!searchTerms || searchTerms.length == 0)) {
      return []
    }
    
    // special case: BBC Search
    if(searchTerms.length >= 3 && pack >= 0 && this.assetsPacks[pack].special == "bbc") {
      const client = new MoulinetteBBCClient()
      const results = await client.search(searchTerms)
      if(results.status != 200) {
        return ui.notifications.warn(game.i18n.localize("mtte.specialSearchFailed"));
      }
      this.searchResults = results.data.results.map((r) => { return { pack: pack, assetURL: `https://sound-effects-media.bbcrewind.co.uk/mp3/${r.id}.mp3`, filename: r.description}})
    }
    // normal cases
    else {
      searchTerms = searchTerms.split(" ")
      // filter list according to search terms and selected pack
      this.searchResults = this.assets.filter( t => {
        // pack doesn't match selection
        if( pack >= 0 && t.pack != pack ) return false
        // check if text match
        for( const f of searchTerms ) {
          if( t.filename.toLowerCase().indexOf(f) < 0 ) return false
        }
        return true;
      })
    }
    
    // playlist
    const playlist = game.playlists.find( pl => pl.data.name == MoulinetteSounds.MOULINETTE_SOUNDBOARD )
    
    // header
    assets.push(`<div class="pack header">` +
        `<input type="checkbox" class="check all" name="all" value="-1">` +
        `<span class="audio"><b>${game.i18n.localize("mtte.name")}</b></span>`+
        `<span class="audioSource"><b>${game.i18n.localize("mtte.publisher")} | ${game.i18n.localize("mtte.pack")}</b></span>`+
        "</div>")
    
    let idx = 0
    this.searchResults.forEach( r => {
      idx++
      const URL = this.assetsPacks[r.pack].isRemote ? `${game.moulinette.applications.MoulinetteClient.SERVER_URL}/assets/` : ""
      const pack   = this.assetsPacks[r.pack]
      
      r.assetURL = pack.special ? r.assetURL : `${URL}${this.assetsPacks[r.pack].path}/${r.filename}`
      const sound  = playlist ? playlist.sounds.find(s => s.path == r.assetURL) : null
      const name   = game.moulinette.applications.Moulinette.prettyText(r.filename.replace("/","").replace(".ogg","").replace(".mp3","").replace(".wav",""))
      const icon   = sound && sound.playing ? "fa-square" : "fa-play"
      const repeat = sound && sound.repeat ? "" : "inactive"
      const volume = sound ? sound.volume : 0.5
      
      let html = `<div class="sound" data-path="${r.assetURL}" data-idx="${idx}">` 
      html += `<input type="checkbox" class="check">`
      if(pack.special) {
        const shortName = name.length <= 30 ? name : name.substring(0,30) + "..."
        html += `<span class="audio" title="${name}">${shortName}</span><span class="audioSource"><a href="${pack.pubWebsite}" target="_blank">${pack.publisher}</a> | <a href="${pack.url}" target="_blank">${pack.name}</a></span><div class="sound-controls flexrow">`
      } else {
        html += `<span class="audio">${name}</span><span class="audioSource">${pack.publisher} | ${pack.name}</span><div class="sound-controls flexrow">`
      }
      html += `<input class="sound-volume" type="range" title="${game.i18n.localize("PLAYLIST.SoundVolume")}" value="${volume}" min="0" max="1" step="0.05">`
      html += `<a class="sound-control ${repeat}" data-action="sound-repeat" title="${game.i18n.localize("PLAYLIST.SoundLoop")}"><i class="fas fa-sync"></i></a>`
      html += `<a class="sound-control" data-action="sound-play" title="${game.i18n.localize("PLAYLIST.SoundPlay")} / ${game.i18n.localize("PLAYLIST.SoundStop")}"><i class="fas ${icon}"></i></a>`
      html += `<a class="sound-control" data-action="favorite" title="${game.i18n.localize("mtte.favoriteSound")}")}"><i class="far fa-bookmark"></i></a>`
      html += "</div></div>"
      
      assets.push(html)
    })
    
    return assets.length == 1 ? [] : assets
  }
  
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html
    
    this.html.find('.check.all').change(event => html.find('.check:not(".all")').prop('checked', event.currentTarget.checked) );
    this.html.find('.sound-volume').change(event => this._onSoundVolume(event));
    this.html.find(".sound-control").click(this._onSoundControl.bind(this))
    
    this._alternateColors()
  }
  
  _alternateColors() {
    $('.forge .sound').removeClass("alt");
    $('.forge .sound:even').addClass("alt");
  }
  
  _onSoundVolume(event) {
    event.preventDefault();
    const slider = event.currentTarget;
    const path = slider.closest(".sound").dataset.path;
    
    // retrieve sound in play list
    const playlist = game.playlists.find( pl => pl.data.name == MoulinetteSounds.MOULINETTE_SOUNDBOARD )
    if(!playlist) return;
    const sound = playlist.sounds.find( s => s.path == path )
    if(!sound) return

    // Only push the update if the user is a GM
    const volume = AudioHelper.inputToVolume(slider.value);
    if (game.user.isGM) playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, volume: volume});

    // Otherwise simply apply a local override
    else {
      let sound = playlist.audio[sound._id];
      if (!sound.howl) return;
      sound.howl.volume(volume, sound._id);
    }
  }
  
  async _onSoundControl(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const idx = source.closest(".sound").dataset.idx;

    if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
      const result = this.searchResults[idx-1]
      // get playlist
      let playlist = game.playlists.find( pl => pl.data.name == MoulinetteSounds.MOULINETTE_SOUNDBOARD )
      if(!playlist) {
        playlist = await Playlist.create({name: MoulinetteSounds.MOULINETTE_SOUNDBOARD, mode: -1})
      }
      // get sound
      let sound = playlist.sounds.find( s => s.path == result.assetURL )
      if(!sound) {
        const name = game.moulinette.applications.Moulinette.prettyText(result.filename.replace("/","").replace(".ogg","").replace(".mp3","").replace(".wav",""))
        const volume = AudioHelper.inputToVolume($(source.closest(".sound")).find(".sound-volume").val())
        const repeat = $(source.closest(".sound")).find("a[data-action='sound-repeat']").hasClass('inactive')
        sound = await playlist.createEmbeddedEntity("PlaylistSound", {name: name, path: result.assetURL, volume: volume}, {});
      }
      // toggle play
      if(source.dataset.action == "sound-play") {
        playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, playing: !sound.playing});
      } else if(source.dataset.action == "sound-repeat") {
        if(sound) {
          playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, repeat: !sound.repeat});
        }
      } else if(source.dataset.action == "favorite") {
        new MoulinetteFavorite({path: sound.path, name: sound.name, label: sound.name, volume: sound.volume }).render(true)
      } else {
        console.log(`MoulinetteSounds | Action ${source.dataset.action} not implemented`)
      }
    }
  }
  
  
  /**
   * Implements actions
   *  
   */
  
  async onAction(classList) {
    const FileUtil = game.moulinette.applications.MoulinetteFileUtil
    if(classList.contains("indexSounds")) {
      ui.notifications.info(game.i18n.localize("mtte.indexingInProgress"));
      this.html.find(".indexSounds").prop("disabled", true);
      const EXT = ["mp3", "ogg", "wav"]
      let publishers = await FileUtil.scanAssets(MoulinetteSounds.FOLDER_CUSTOM_SOUNDS, EXT)
      const customPath = game.settings.get("moulinette-core", "customPath")
      if(customPath) {
        publishers.push(...await FileUtil.scanAssetsInCustomFolders(customPath, EXT))
      }
      await FileUtil.upload(new File([JSON.stringify(publishers)], "index.json", { type: "application/json", lastModified: new Date() }), "index.json", "/moulinette/sounds", MoulinetteSounds.FOLDER_CUSTOM_SOUNDS, true)
      ui.notifications.info(game.i18n.localize("mtte.indexingDone"));
      return true
    }
    else if(classList.contains("customReferences")) {
      new Dialog({title: game.i18n.localize("mtte.customReferencesPacks"), buttons: {}}, { id: "moulinette-info", classes: ["info"], template: "modules/moulinette-sounds/templates/custom-references.hbs", width: 650, height: "auto" }).render(true)
    }
    else if(classList.contains("howto")) {
      new Dialog({title: game.i18n.localize("mtte.howto"), buttons: {}}, { id: "moulinette-help", classes: ["howto"], template: `modules/moulinette-sounds/templates/help.hbs`, width: 650, height: 700, resizable: true }).render(true)
    }
    else if (classList.contains("activatePlaylist")) {
      ui.playlists.activate()
      // collapse all playlists but Moulinette
      $("#playlists .directory-item").each( function() {
        if(!$(this).hasClass("collapsed") && !$(this).find(".playlist-name").text().trim().startsWith("Moulinette")) {
          $(this).find(".playlist-name").click()
        }
      })
      // open Moulinette if collapsed
      $("#playlists .playlist-name").filter(function() { return $(this).text().trim().startsWith("Moulinette") }).each(function(index) { 
        if($(this).closest(".directory-item").hasClass("collapsed")) {
          $(this).click()
        }
      })
    }
    else if (classList.contains("deletePlaylist")) {
      Dialog.confirm({
        title: game.i18n.localize("mtte.deletePlayListAction"),
        content: game.i18n.localize("mtte.deletePlayListContent"),
        yes: async function() { 
          const playlist = game.playlists.find( p => p.name == MoulinetteSounds.MOULINETTE_SOUNDBOARD )
          if(playlist) {
            let updates = []
            // stop any playing sound
            for( const sound of playlist.sounds ) {
              if(sound.playing) {
                updates.push({_id: sound._id, playing: false})
              }
            }
            if(updates.length > 0) {
              await playlist.updateEmbeddedEntity("PlaylistSound", updates);
            }
            await playlist.delete()
          }
        },
        no: () => {}
      });
    }
    else if (classList.contains("playChecked") || classList.contains("favoriteChecked")) {
      // prepare selected sounds
      let selected = []
      let isFirst = true
      this.html.find(".check:checkbox:checked").each(function(index) { 
        const path = $(this).closest(".sound").data('path')
        const name = $(this).closest(".sound").find('.audio').text()
        const volume = $(this).closest(".sound").find('.sound-volume').val()
        if(path) { selected.push({name: name, path: path, volume: volume, playing: isFirst}); isFirst = false }
      })
      
      if(selected.length == 0) return;
      
      if (classList.contains("playChecked")) {
        // delete any existing playlist
        let playlist = game.playlists.find( pl => pl.data.name == MoulinetteSounds.MOULINETTE_PLAYLIST )
        if(playlist) { await playlist.delete() }
        playlist = await Playlist.create({name: MoulinetteSounds.MOULINETTE_PLAYLIST})
        
        playlist.createEmbeddedEntity("PlaylistSound", selected)
        playlist.update({ playing: true})
      }
      else if (classList.contains("favoriteChecked")) { 
        const paths = selected.length == 1 ? selected[0].path : selected.map( (sound, idx) => sound.path )
        const name = selected.length == 1 ? selected[0].name : game.i18n.localize("mtte.favoriteMultiple")
        const volume = selected[0].volume
        const label = selected[0].name
        new MoulinetteFavorite({path: paths, name: name, label: label, volume: volume }).render(true)
      }
    }
  }

  
  
  
  /*** **************************** Soundboard *******************************************/
  
  getControls() {
    let html = ""
    let favorites = game.settings.get("moulinette", "soundboard")
    const cols = game.settings.get("moulinette-sounds", "soundboardCols")
    const rows = game.settings.get("moulinette-sounds", "soundboardRows")
    
    for(let r=0; r<rows; r++) {
      html += `<ul><li class="title" data-type="sounds">${r == 0 ? game.i18n.localize("mtte.soundboard") : ""}</li>`
      for(let c=0; c<cols; c++) {
        const i = 1 + (r*cols) + c
        let name = `${i}`
        if(Object.keys(favorites).includes("fav" + i)) {
          const fav = favorites["fav" + i]
          if(fav.icon && fav.icon.length > 0) {
            if(fav.faIcon) {
              name = `<i class="fas fa-${fav.icon}" title="${fav.name}"></i>`
            } else {
              name = `<img class="icon" title="${fav.name}" src="${fav.icon}" draggable="true"/>`
            }
          } else {
            name = fav.name
          }
        }
        html += `<li class="fav" data-slot="${i}" draggable="true">${name}</li>`
      }
      html += "</ul>"
    }
    return html
  }
  
  
  async activateControlsListeners(html) {
    html.find('.moulinette-options li.fav').click(ev => this._playFavorite(ev, html))
    html.find('.moulinette-options li.fav').mousedown(ev => this._editFavorite(ev, html))
    
    html.find('.moulinette-options li.fav').on('dragstart',function (event) {
      const slot = event.currentTarget.dataset.slot
      event.originalEvent.dataTransfer.setData("text/plain", slot)
    })

    html.find('.moulinette-options li.fav').on('drop', async function (event) {
      event.preventDefault();
      const fromSlot = event.originalEvent.dataTransfer.getData("text/plain");
      const toSlot = event.currentTarget.dataset.slot
      let favorites = game.settings.get("moulinette", "soundboard")
      if(fromSlot && toSlot && fromSlot != toSlot && Object.keys(favorites).includes("fav" + fromSlot)) {
        const fromFav = favorites["fav" + fromSlot]
        const toFav = Object.keys(favorites).includes("fav" + toSlot) ? favorites["fav" + toSlot] : null
        let overwrite = null
        // target not defined => move
        if(!toFav) {
          overwrite = true
        }
        // target defined => prompt for desired behaviour
        else {
          overwrite = await Dialog.confirm({
            title: game.i18n.localize("mtte.moveFavorite"),
            content: game.i18n.format("mtte.moveFavoriteContent", { from: fromFav.name, to: toFav.name}),
          })
          if(overwrite == null) return;
        }
        favorites["fav" + toSlot] = fromFav
        if(overwrite) {
          delete favorites["fav" + fromSlot]
        } else {
          favorites["fav" + fromSlot] = toFav
        }
        await game.settings.set("moulinette", "soundboard", favorites)
        game.moulinette.applications.Moulinette._createOptionsTable($('#controls'))
      }
    })
    
    html.find('.moulinette-options li.fav').on('dragover',function (event) {
      event.preventDefault();
    })
  }
  
  async _editFavorite(event, html) {
    // right click only
    if(event.which == 3) {
      const slot = event.currentTarget.dataset.slot;
      let favorites = game.settings.get("moulinette", "soundboard")
      if(Object.keys(favorites).includes("fav" + slot)) {
        const fav = favorites["fav" + slot]
        let data = {name: fav.name, label: fav.name, path: fav.path, volume: fav.volume, slot: slot}
        if(fav.faIcon) {
          data["icon"] = fav.icon
        } else if(fav.icon.length > 0) {
          data["icon2"] = fav.icon
        }
        const moulinette = new MoulinetteFavorite(data);
        moulinette.options.title = game.i18n.localize("mtte.favoriteEdit")
        moulinette.render(true)
      }
    }
  }
  
  async _playFavorite(event, html) {
    const slot = event.currentTarget.dataset.slot
    if(slot) {
      let favorites = game.settings.get("moulinette", "soundboard")
      if(Object.keys(favorites).includes("fav" + slot)) {
        const fav = favorites["fav" + slot]
        // get playlist
        let playlist = game.playlists.find( pl => pl.data.name == MoulinetteSounds.MOULINETTE_SOUNDBOARD )
        if(!playlist) {
          playlist = await Playlist.create({name: MoulinetteSounds.MOULINETTE_SOUNDBOARD, mode: -1})
        }
        let path = fav.path
        if(Array.isArray(path)) {
          const rand = Math.floor((Math.random() * path.length));
          path = path[rand]
        } 
        // get sound
        let sound = playlist.sounds.find( s => s.path == path )
        if(!sound) {
          const name = fav.name
          const repeat = false
          sound = await playlist.createEmbeddedEntity("PlaylistSound", {name: name, path: path, volume: fav.volume}, {});
        }
        playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, playing: !sound.playing});
      } else {
        ui.notifications.warn(game.i18n.localize("mtte.slotNotAssigned"));
        const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
        new forgeClass("sounds").render(true)
        event.stopPropagation();
      }
    }
  }
  
}
