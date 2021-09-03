import { MoulinetteBBCClient } from "./moulinette-bbc-client.js"
import { MoulinetteFavorite } from "./moulinette-favorite.js"

/**
 * Forge Module for sounds
 */
export class MoulinetteSounds extends game.moulinette.applications.MoulinetteForgeModule {

  static FOLDER_CUSTOM_SOUNDS   = "moulinette/sounds/custom"
  
  static MOULINETTE_SOUNDBOARD  = "Moulinette Soundboard"
  static MOULINETTE_PLAYLIST    = "Moulinette Playlist"
  
  constructor() {
    super()
  }
  
  clearCache() {
    this.assets = null
    this.assetsPacks = null
    this.searchResults = null
    this.pack = null
  }
  
  /**
   * Returns the list of available packs
   */
  async getPackList() {
    const bbc = [{ special: "bbc", publisher: "BBC", name: "Sounds Effects (bbc.co.uk – © copyright 2021 BBC)", pubWebsite: "https://www.bbc.co.uk", url: "https://sound-effects.bbcrewind.co.uk", "license": "check website", isRemote: true }]
    const user = await game.moulinette.applications.Moulinette.getUser()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id,
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/byoa/assets/" + game.moulinette.user.id,
      game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + "moulinette/sounds/custom/index.json"], bbc)
    
    // remove thumbnails and non-sounds from assets
    this.assets = index.assets.filter(a => {
      if(a.type != "snd") {
        // decrease count in pack
        index.packs[a.pack].count--
        return false;
      }
      return true;
    })
    this.assetsPacks = index.packs
    return duplicate(this.assetsPacks)
  }
  
  /**
   * Generate a new asset (HTML) for the given result and idx
   */
  generateAsset(playlist, r, idx) {
    const URL = this.assetsPacks[r.pack].isRemote ? "" : game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    const pack   = this.assetsPacks[r.pack]
    
    const repeatDefault = game.settings.get("moulinette-sounds", "defaultRepeatOn")
    
    r.sas = pack.sas ? "?" + pack.sas : ""
    r.assetURL = pack.special ? r.assetURL : (r.filename.match(/^https?:\/\//) ? r.filename : `${URL}${this.assetsPacks[r.pack].path}/${r.filename}`)
    const sound  = playlist ? playlist.sounds.find(s => s.path == r.assetURL) : null
    const name   = game.moulinette.applications.Moulinette.prettyText(r.filename.split("/").pop().replace(".ogg","").replace(".mp3","").replace(".wav","").replace(".webm","").replace(".m4a",""))
    const icon   = sound && sound.playing ? "fa-square" : "fa-play"
    const repeat = sound ? (sound.repeat ? "" : "inactive") : (repeatDefault ? "" : "inactive")
    const volume = sound ? sound.volume : 0.5
    
    let html = `<div class="sound" data-path="${r.assetURL}" data-filename="${r.filename}" data-idx="${idx}">` 
    html += `<span class="draggable"><i class="fas fa-music"></i></span><input id="snd-${idx}" type="checkbox" class="check">`
    if(pack.special) {
      const shortName = name.length <= 50 ? name : name.substring(0,50) + "..."
      html += `<span class="audio" title="${name}"><label for="snd-${idx}">${shortName}</label></span><div class="sound-controls flexrow">`
    } else {
      html += `<span class="audio"><label for="snd-${idx}">${name}</label></span><div class="sound-controls flexrow">`
    }
    html += `<input class="sound-volume" type="range" title="${game.i18n.localize("PLAYLIST.SoundVolume")}" value="${volume}" min="0" max="1" step="0.05">`
    html += `<a class="sound-control ${repeat}" data-action="sound-repeat" title="${game.i18n.localize("PLAYLIST.SoundLoop")}"><i class="fas fa-sync"></i></a>`
    html += `<a class="sound-control" data-action="sound-play" title="${game.i18n.localize("PLAYLIST.SoundPlay")} / ${game.i18n.localize("PLAYLIST.SoundStop")}"><i class="fas ${icon}"></i></a>`
    html += `<a class="sound-control" data-action="favorite" title="${game.i18n.localize("mtte.favoriteSound")}")}"><i class="far fa-bookmark"></i></a>`
    html += "</div></div>"
    return html
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, pack, publisher) {
    let assets = []
    
    // pack must be selected or terms provided
    if((!pack || pack < 0) && (!publisher || publisher.length == 0) && (!searchTerms || searchTerms.length == 0)) {
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
        // publisher doesn't match selection
        if( publisher && publisher != this.assetsPacks[t.pack].publisher ) return false
        // check if text match
        for( const f of searchTerms ) {
          if( t.filename.toLowerCase().indexOf(f) < 0 ) return false
        }
        return true;
      })
    }

    const viewMode = game.settings.get("moulinette", "displayMode")
    const playlist = game.playlists.find( pl => pl.data.name == MoulinetteSounds.MOULINETTE_SOUNDBOARD )
    
    // header
    assets.push(`<div class="pack header sound"><span><i class="fas fa-music"></i></span>` +
        `<input type="checkbox" class="check all" name="all" value="-1">` +
        `<span class="audio"><b>${game.i18n.localize("mtte.name")}</b></span>`+
        "</div>")
    
    // view #1 (all mixed)
    if(viewMode == "tiles") {
      let idx = 0
      this.searchResults.sort((a,b) => a.filename.split("/").pop().localeCompare(b.filename.split("/").pop()))
      for(const r of this.searchResults) {
        idx++
        assets.push(this.generateAsset(playlist, r, idx))
      }
    }
    // view #2 (by folder)
    else if(viewMode == "list" || viewMode == "browse") {
      const folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(this.searchResults, this.assetsPacks);
      const keys = Object.keys(folders).sort()
      for(const k of keys) {
        if(viewMode == "browse") {
          assets.push(`<div class="folder" data-path="${k}"><h2 class="expand">${k} (${folders[k].length}) <i class="fas fa-angle-double-down"></i></h2></div>`)
        } else {
          assets.push(`<div class="folder" data-path="${k}"><h2>${k} (${folders[k].length})</div>`)
        }
        for(const a of folders[k]) {
          assets.push(this.generateAsset(playlist, a, a.idx))
        }
      }
    }
    
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
    this.html.find(".draggable").click(this._onToggleSelect.bind(this))
    
    this._alternateColors()
  }
  
  _alternateColors() {
    $('.forge .sound').removeClass("alt");
    $('.forge .sound:even').addClass("alt");
  }
  
  onDragStart(event) {
    const div = event.currentTarget.closest(".sound");
    const idx = div.dataset.idx;
    
    // invalid action
    if(!this.searchResults || idx < 0 || idx > this.searchResults.length) return
    
    const sound = this.searchResults[idx-1]
    const pack = this.assetsPacks[sound.pack]
    const volume = $(div).find('.sound-volume').val()
    const repeat = !$(div).find("a[data-action='sound-repeat']").hasClass('inactive')

    let dragData = {}
    dragData = {
      source: "mtte",
      type: "Sound",
      sound: sound,
      pack: pack,
      volume: volume,
      repeat: repeat
    };
    
    dragData.source = "mtte"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }
  
  /**
   * Download the asset received from event
   * - data.path will be set with local path
   */
  static async downloadAsset(data) {
    if(!data.pack.isRemote || data.pack.special) {
      const baseURL = game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
      data.path =  data.sound.assetURL
    }
    else {
      await game.moulinette.applications.MoulinetteFileUtil.downloadAssetDependencies(data.sound, data.pack, "sounds")
      data.path = game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + game.moulinette.applications.MoulinetteFileUtil.getMoulinetteBasePath("sounds", data.pack.publisher, data.pack.name) + data.sound.filename      
    }

    // Clear useless info
    delete data.pack
    delete data.sound
  }
  
  
  /**
   * Generate a sound from the dragged image
   */
  static async createSound(data) {
    if ( !data.sound || !data.pack ) return;
    await MoulinetteSounds.downloadAsset(data)
    
    // Validate that the drop position is in-bounds and snap to grid
    if ( !canvas.grid.hitArea.contains(data.x, data.y) ) return false;
    
    const sound = AmbientSound.create({
      t: "l",
      x: data.x,
      y: data.y,
      path: data.path,
      radius: game.settings.get("moulinette-sounds", "defaultEffectRadius"),
      repeat: true,
      volume: 1
    });
    canvas.getLayer("SoundsLayer").activate();
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
    if (game.user.isGM) {
      if(game.data.version.startsWith("0.7")) {
        playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, volume: volume});
      } else {
        playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, volume: volume}]);
      }
    }

    // Otherwise simply apply a local override
    else {
      let sound = playlist.audio[sound.id];
      if (!sound.howl) return;
      sound.howl.volume(volume, sound.id);
    }
  }
  
  async _onToggleSelect(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const list = source.closest(".list")
    const parent = source.closest(".sound")
    const isSelected = $(parent).hasClass("selected")
    $(list).find(".sound").removeClass("selected")
    if(!isSelected) {
      const idx = parent.dataset.idx
      if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
        $(parent).addClass("selected")
        const result = this.searchResults[idx-1]
        let soundData = { sound: result, pack:  this.assetsPacks[result.pack] }
        game.moulinette.cache.setData("selSound", soundData)
      }
    } else {
      game.moulinette.cache.setData("selSound", null)
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
      // download sound
      let soundData = { sound: result, pack:  this.assetsPacks[result.pack] }
      await MoulinetteSounds.downloadAsset(soundData)
      // get sound
      let sound = playlist.sounds.find( s => s.path == soundData.path )
      if(!sound) {
        sound = soundData
        sound.name = game.moulinette.applications.Moulinette.prettyText(result.filename.replace("/","").replace(".ogg","").replace(".mp3","").replace(".wav","").replace(".webm","").replace(".m4a",""))
        sound.volume = AudioHelper.inputToVolume($(source.closest(".sound")).find(".sound-volume").val())
        sound.repeat = !$(source.closest(".sound")).find("a[data-action='sound-repeat']").hasClass('inactive')
        if(game.data.version.startsWith("0.7")) {
          sound = await playlist.createEmbeddedEntity("PlaylistSound", sound, {});
        } else {
          sound = (await playlist.createEmbeddedDocuments("PlaylistSound", [sound], {}))[0]
        }
      }
      // toggle play
      if(source.dataset.action == "sound-play") {
        if(game.data.version.startsWith("0.7")) {
          playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, playing: !sound.playing});
        } else {
          playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, playing: !sound.data.playing}]);
        }
      } else if(source.dataset.action == "sound-repeat") {
        if(sound) {
          if(game.data.version.startsWith("0.7")) {
            playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, repeat: !sound.repeat});
          } else {
            playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, repeat: !sound.data.repeat}]);
          }
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
      const EXT = ["mp3", "ogg", "wav", "webm", "m4a"]
      let publishers = await FileUtil.scanAssets(MoulinetteSounds.FOLDER_CUSTOM_SOUNDS, EXT)
      const customPath = game.settings.get("moulinette-core", "customPath")
      if(customPath) {
        publishers.push(...await FileUtil.scanAssetsInCustomFolders(customPath, EXT))
      }
      publishers.push(...await FileUtil.scanSourceAssets("sounds", EXT))
      await FileUtil.upload(new File([JSON.stringify(publishers)], "index.json", { type: "application/json", lastModified: new Date() }), "index.json", "/moulinette/sounds", MoulinetteSounds.FOLDER_CUSTOM_SOUNDS, true)
      ui.notifications.info(game.i18n.localize("mtte.indexingDone"));
      // clear cache
      game.moulinette.cache.clear()
      this.clearCache()
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
                if(game.data.version.startsWith("0.7")) {
                  updates.push({_id: sound._id, playing: false})
                } else {
                  updates.push({_id: sound.id, playing: false})
                }
              }
            }
            if(updates.length > 0) {
              if(game.data.version.startsWith("0.7")) {
                await playlist.updateEmbeddedEntity("PlaylistSound", updates);
              } else {
                await playlist.updateEmbeddedDocuments("PlaylistSound", updates);
              }
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
      const instance = this
      this.html.find(".check:checkbox:checked").each(function(index) { 
        const idx = this.closest(".sound").dataset.idx;
        const name = $(this).closest(".sound").find('.audio').text()
        const volume = $(this).closest(".sound").find('.sound-volume').val()
        
        if(instance.searchResults && idx > 0 && idx <= instance.searchResults.length) {
          const result = instance.searchResults[idx-1]
          let soundData = { sound: result, pack: instance.assetsPacks[result.pack] }
          selected.push({name: name, soundData: soundData, volume: volume, playing: isFirst})
          isFirst = false
        }
      })
      
      // download all sounds (if from cloud)
      SceneNavigation._onLoadProgress(game.i18n.localize("mtte.downloadingSounds"),0);  
      let idx = 0
      for(const sel of selected) {
        idx++;
        await MoulinetteSounds.downloadAsset(sel.soundData)
        sel.path = sel.soundData.path // retrieve new path
        delete sel.soundData          // delete soundData that is not used by FVTT
        SceneNavigation._onLoadProgress(game.i18n.localize("mtte.downloadingSounds"), Math.round((idx / selected.length)*100));
      }
      SceneNavigation._onLoadProgress(game.i18n.localize("mtte.downloadingSounds"),100);
      
      if(selected.length == 0) return;
      
      if (classList.contains("playChecked")) {
        // delete any existing playlist
        let playlist = game.playlists.find( pl => pl.data.name == MoulinetteSounds.MOULINETTE_PLAYLIST )
        if(playlist) { await playlist.delete() }
        playlist = await Playlist.create({name: MoulinetteSounds.MOULINETTE_PLAYLIST})
        
        if(game.data.version.startsWith("0.7")) {
          await playlist.createEmbeddedEntity("PlaylistSound", selected)
          await playlist.update({ playing: true})
        } else {
          await playlist.createEmbeddedDocuments("PlaylistSound", selected)
          await playlist.playAll()
        }
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
    
    if(game.settings.get("moulinette", "soundboardPin")) {
      html.find(".shortcut[data-type='pin']").addClass("active")
    } 
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
    if(game.settings.get("moulinette", "soundboardPin")) {
      event.stopPropagation();
    }
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
        if(Array.isArray(sound)) sound = sound[0] // just in case multiple sounds have the same path
        if(!sound) {
          const name = path.split("/").pop()
          const repeat = false
          if(game.data.version.startsWith("0.7")) {
            sound = await playlist.createEmbeddedEntity("PlaylistSound", {name: name, path: path, volume: fav.volume}, {});
          } else {
            sound = (await playlist.createEmbeddedDocuments("PlaylistSound", [{name: name, path: path, volume: Number(fav.volume)}], {}))[0]
          }
        }
        if(game.data.version.startsWith("0.7")) {
          playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, playing: !sound.playing, volume: fav.volume });
        } else {
          playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, playing: !sound.data.playing, volume: Number(fav.volume) }]);
        }
      } else {
        ui.notifications.warn(game.i18n.localize("mtte.slotNotAssigned"));
        const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
        new forgeClass("sounds").render(true)
        event.stopPropagation();
      }
    }
  }
  
  
  async onShortcut(type) {
    if(type == "pin") {
      // toggle pin
      await game.settings.set("moulinette", "soundboardPin", !game.settings.get("moulinette", "soundboardPin"))
      $("#moulinetteOptions").find(".shortcut[data-type='pin']").toggleClass("active")
    }
  }
  
}
