import { MoulinetteBBCClient } from "./moulinette-bbc-client.js"
import { MoulinetteFavorite } from "./moulinette-favorite.js"
import { MoulinetteSoundBoard } from "./moulinette-soundboard.js"
import { MoulinetteSoundsUtil } from "./moulinette-sounds-util.js"

/**
 * Forge Module for sounds
 */
export class MoulinetteSounds extends game.moulinette.applications.MoulinetteForgeModule {

  static FOLDER_CUSTOM_SOUNDS   = "moulinette/sounds/custom"

  static MOULINETTE_SOUNDBOARD  = "Moulinette Soundboard"
  static MOULINETTE_PLAYLIST    = "Moulinette Playlist"

  static AUDIO_EXT = ["mp3", "ogg", "wav", "webm", "m4a", "flac"]

  constructor() {
    super()
  }

  supportsWholeWordSearch() { return true }

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
    // already in cache
    if(this.assetsPacks) {
      return duplicate(this.assetsPacks)
    }

    const bbc = [{ special: "bbc", publisher: "BBC", name: "Sounds Effects (bbc.co.uk – © copyright 2021 BBC)", pubWebsite: "https://www.bbc.co.uk", url: "https://sound-effects.bbcrewind.co.uk", "license": "check website", isRemote: true }]
    const user = await game.moulinette.applications.Moulinette.getUser()
    const worldId = game.world.id
    const baseURL = await game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id,
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/byoa/assets/" + game.moulinette.user.id,
      baseURL + `moulinette/sounds/custom/index-mtte.json`], bbc)
    
    const TTAPack = MoulinetteSoundsUtil.noTTADownload() ? index.packs.find(p => p.publisher == "Tabletop Audio" && p.isRemote) : null
    const TTAFilter = TTAPack ? TTAPack.idx : -1

    // remove thumbnails and non-sounds from assets
    this.assets = index.assets.filter(a => {
      if(a.type != "snd" || a.pack == TTAFilter) {
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
   * Returns the URL of the specified asset
   * 
   * @param {*} packIdx pack Index
   * @param {*} path relative path
   */
  async getAssetURL(packIdx, path) {
    // make sure that data is loaded in cache
    await this.getPackList()
    // search pack
    const pack = this.assetsPacks.find(p => p.idx == packIdx)
    if(pack) {
      // search asset in path
      const asset = this.assets.find(a => a.pack == pack.idx && a.filename == path)
      if(asset) {
        const data = {pack: pack, sound: asset}
        await MoulinetteSoundsUtil.downloadAsset(data)
        return data.path
      }
    }
    return null
  }
  
  /**
   * Generate a new asset (HTML) for the given result and idx
   */
  async generateAsset(playlist, r, idx, selSound, folderIdx = null) {
    const FileUtil = game.moulinette.applications.MoulinetteFileUtil
    const URL = this.assetsPacks[r.pack].isRemote || this.assetsPacks[r.pack].isLocal ? "" : await FileUtil.getBaseURL()
    const pack   = this.assetsPacks[r.pack]
    
    const repeatDefault = game.settings.get("moulinette-sounds", "defaultRepeatOn")
    
    // individually-purchased assets already have a sas (otherwise, use pack one)
    if(!r.sas) {
      r.sas = pack.sas ? "?" + pack.sas : ""
    }

    r.assetURL = pack.special ? r.assetURL : (r.filename.match(/^https?:\/\//) ? r.filename : `${URL}${this.assetsPacks[r.pack].path}/${FileUtil.encodeURL(r.filename)}`)
    const sound  = playlist ? playlist.sounds.find(s => s.path == r.assetURL) : null
    const name   = game.moulinette.applications.Moulinette.prettyText(r.title && r.title.length > 0 ? r.title : r.filename.split("/").pop())
    const icon   = sound && sound.playing ? "fa-square" : "fa-play"
    const repeat = r.loop || (sound ? (sound.repeat ? "" : "inactive") : (repeatDefault ? "" : "inactive"))
    const volume = sound ? sound.volume : 0.5
    const selected = selSound && r.assetURL == selSound.sound.assetURL ? "selected" : ""

    const durHr = Math.floor(r.duration / (3600))
    const durMin = Math.floor((r.duration - 3600*durHr)/60)
    const durSec = r.duration % 60
    const duration = (durHr > 0 ? `${durHr}:${durMin.toString().padStart(2,'0')}` : durMin.toString()) + ":" + durSec.toString().padStart(2,'0')

    const shortName = name.length <= 40 ? name : name.substring(0,40) + "..."

    // add folder index if browsing by folder
    const folderHTML = folderIdx ? `data-folder="${folderIdx}"` : ""

    let html = `<div class="sound ${selected}" data-path="${r.assetURL}" data-filename="${r.filename}" data-idx="${idx}" ${folderHTML}>` +
      `<div class="audio draggable" title="${r.filename.split("/").pop().replaceAll("\"", "'")}">${shortName}</div>` +
      `<div class="background"><i class="fas fa-music"></i></div>` +
      `<div class="duration"><i class="far fa-hourglass"></i> ${duration}</div>` +
      `<div class="checkbox"><i class="far fa-check-square"></i></a></div>` +
      `<div class="sound-controls">` +
        `<div class="ctrl sound-volume"><input type="range" title="${game.i18n.localize("PLAYLIST.SoundVolume")}" value="${volume}" min="0" max="1" step="0.05"></div>` +
        `<div class="ctrl sound-repeat"><a class="${repeat}" data-action="sound-repeat" title="${game.i18n.localize("PLAYLIST.SoundLoop")}"><i class="fas fa-sync"></i></a></div>` +
        `<div class="ctrl sound-play"><a data-action="sound-play" title="${game.i18n.localize("PLAYLIST.SoundPlay")} / ${game.i18n.localize("PLAYLIST.SoundStop")}"><i class="fas ${icon}"></i></a></div>` +
        `<div class="ctrl sound-preview"><a data-action="sound-preview" title="${game.i18n.localize("mtte.previewSound")}"><i class="fas fa-headphones"></i></a></div>` +
        `<div class="ctrl sound-favorite"><a data-action="favorite" title="${game.i18n.localize("mtte.favoriteSound")}")}"><i class="far fa-bookmark"></i></a></div>` +
        `<div class="ctrl sound-clipboard"><a data-action="clipboard" title="${game.i18n.localize("mtte.clipboardImageToolTip")}")}"><i class="far fa-clipboard"></i></a></div>` +
      "</div></div>"

    return html
  }
  
  /**
   * Footer: audio control for previewing sounds
   */
  async getFooter() {
    return `<audio id=\"prevSound\"></audio>`
  }

  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, packs, publisher) {
    let assets = []
    const packList = packs == "-1" ? null : ('' + packs).split(",").map(Number);

    // pack must be selected or terms provided
    if(!packList && (!publisher || publisher.length == 0) && (!searchTerms || searchTerms.length == 0)) {
      return []
    }
    
    // special case: BBC Search
    if(searchTerms.length >= 3 && publisher == "BBC") {
      const client = new MoulinetteBBCClient()
      const results = await client.search(searchTerms)
      if(results.status != 200) {
        return ui.notifications.warn(game.i18n.localize("mtte.specialSearchFailed"));
      }
      this.searchResults = results.data.results.map((r) => {
        const pack = this.assetsPacks.find(p => p.publisher == "BBC")
        return { pack: pack.idx, assetURL: `https://sound-effects-media.bbcrewind.co.uk/mp3/${r.id}.mp3`, filename: r.description, duration: Math.round(r.duration/1000)}
      })
    }
    // normal cases
    else {
      const wholeWord = game.settings.get("moulinette", "wholeWordSearch")
      const searchTermsList = searchTerms ? searchTerms.split(" ") : []
      // filter list according to search terms and selected pack
      this.searchResults = this.assets.filter( t => {
         // pack doesn't match selection
        if( packList && !packList.includes(t.pack) ) return false
        // publisher doesn't match selection
        if( publisher && publisher != this.assetsPacks[t.pack].publisher ) return false
        // check if text match
        for( const f of searchTermsList ) {
          const textToSearch = game.moulinette.applications.Moulinette.cleanForSearch(t.filename)
          const regex = wholeWord ? new RegExp("\\b"+ f.toLowerCase() +"\\b") : new RegExp(f.toLowerCase())
          if(!regex.test(textToSearch)) {
            return false;
          }
        }
        return true;
      })
    }

    const viewMode = game.settings.get("moulinette", "displayMode")
    const playlist = game.playlists.find( pl => pl.name == MoulinetteSounds.MOULINETTE_SOUNDBOARD )
    const selSound = game.moulinette.cache.getData("selSound")

    // view #1 (all mixed)
    if(viewMode == "tiles") {
      let idx = 0
      this.searchResults.sort((a,b) => a.filename.split("/").pop().localeCompare(b.filename.split("/").pop()))
      for(const r of this.searchResults) {
        idx++
        assets.push(await this.generateAsset(playlist, r, idx, selSound))
      }
    }
    // view #2 (by folder)
    else if(viewMode == "list" || viewMode == "browse") {
      const folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(this.searchResults, this.assetsPacks);
      const keys = Object.keys(folders).sort()
      let folderIdx = 0
      for(const k of keys) {
        folderIdx++;
        const breadcrumb = game.moulinette.applications.Moulinette.prettyBreadcrumb(k)
        if(viewMode == "browse") {
          assets.push(`<div class="folder" data-idx="${folderIdx}"><h2 class="expand">${breadcrumb} (${folders[k].length}) <i class="fas fa-angle-double-down"></i></h2></div>`)
        } else {
          assets.push(`<div class="folder" data-idx="${folderIdx}"><h2>${breadcrumb} (${folders[k].length})</div>`)
        }
        for(const a of folders[k]) {
          a.fIdx = folderIdx
          assets.push(await this.generateAsset(playlist, a, a.idx, selSound, folderIdx))
        }
      }
    }

    // retrieve available assets that the user doesn't have access to
    this.matchesCloudTerms = searchTerms
    const parent = this
    await game.moulinette.applications.MoulinetteFileUtil.getAvailableMatchesMoulinetteCloud(searchTerms, "sounds", true).then(results => {
      // not yet ready?
      if(!parent.html) return;
      // display/hide showCase
      const showCase = parent.html.find(".showcase")
      if(results && results.count > 0) {
        // display/hide additional content
        showCase.html('<i class="fas fa-exclamation-circle"></i> ' + game.i18n.format("mtte.showCaseAssets", {count: results.count}))
        showCase.addClass("clickable")
        showCase.show()
      }
      else {
        showCase.html("")
        showCase.removeClass("clickable")
        showCase.hide()
      }
    })
    
    return assets
  }
  
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html
    
    this.html.find('.sound-volume input').change(event => this._onSoundVolume(event));
    this.html.find(".sound-controls a").click(this._onSoundControl.bind(this))
    this.html.find(".draggable").click(this._onToggleSelect.bind(this))
    this.html.find(".sound").mousedown(this._onMouseDown.bind(this))

    // click on showcase
    this.html.find(".showcase").click(ev => new game.moulinette.applications.MoulinetteAvailableAssets(this.matchesCloudTerms, "sounds", 100).render(true))
  }

  _onMouseDown(event) {
    if(event.which == 3) {
      const source = event.currentTarget;
      $(source).toggleClass("checked")
    }
  }

  onDragStart(event) {
    const div = event.currentTarget.closest(".sound");
    const idx = div.dataset.idx;
    
    // invalid action
    if(!this.searchResults || idx < 0 || idx > this.searchResults.length) return
    
    const sound = this.searchResults[idx-1]
    const pack = this.assetsPacks[sound.pack]
    const volume = $(div).find('.sound-volume input').val()
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
   * Generate a sound from the dragged image
   */
  static async createSound(data) {
    if ( !data.sound || !data.pack ) return;
    await MoulinetteSoundsUtil.downloadAsset(data)
    
    // Validate that the drop position is in-bounds and snap to grid
    if ( !canvas.dimensions.rect.contains(data.x, data.y) ) return false;
    
    const soundData = {
      t: "l",
      x: data.x,
      y: data.y,
      path: data.path,
      radius: game.settings.get("moulinette-sounds", "defaultEffectRadius"),
      repeat: true,
      volume: 1
    }
    await canvas.scene.createEmbeddedDocuments("AmbientSound", [soundData]);
    canvas.sounds.activate();
  }

  
  _onSoundVolume(event) {
    event.preventDefault();
    const slider = event.currentTarget;
    const volume = AudioHelper.inputToVolume(slider.value);
    let path = slider.closest(".sound").dataset.path;
    if(path.startsWith("https")) {
      path = path.split("/").pop()
    }
    
    // Update preview volume, too
    this.html.find("#prevSound").prop("volume", volume);

    // retrieve sound in play list
    const playlist = game.playlists.find( pl => pl.data.name == MoulinetteSounds.MOULINETTE_SOUNDBOARD )
    if(!playlist) return;
    const sound = playlist.sounds.find( s => s.path.endsWith(path) )
    if(!sound) return

    // Only push the update if the user is a GM
    if (game.user.isGM) {
      playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, volume: volume}]);
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
      let playlist = game.playlists.find( pl => pl.name == MoulinetteSounds.MOULINETTE_SOUNDBOARD )
      if(!playlist) {
        playlist = await Playlist.create({name: MoulinetteSounds.MOULINETTE_SOUNDBOARD, mode: -1})
      }

      // CONTROL : preview sound (directly from cloud)
      if(source.dataset.action == "sound-preview") {
        const previewSound = document.getElementById("prevSound")
        if(previewSound.paused) {
          previewSound.src = `${result.assetURL}${result.sas}`
          previewSound.play();
        }
        else {
          previewSound.pause();
          previewSound.currentTime = 0;
        }
        return;
      }

      // download sound
      let soundData = { sound: result, pack:  this.assetsPacks[result.pack] }
      await MoulinetteSoundsUtil.downloadAsset(soundData)
      // get sound
      let sound = playlist.sounds.find( s => s.path == soundData.path )
      if(!sound) {
        sound = soundData
        sound.name = game.moulinette.applications.Moulinette.prettyText(result.filename.replace("/"," | "))
        sound.volume = AudioHelper.inputToVolume($(source.closest(".sound")).find(".sound-volume input").val())
        sound.repeat = !$(source.closest(".sound")).find("a[data-action='sound-repeat']").hasClass('inactive')
      }
      // CONTROL : toggle play
      if(source.dataset.action == "sound-play") {
        // add sound to playlist before playing it (unless already exists)
        if(!sound.id) sound = (await playlist.createEmbeddedDocuments("PlaylistSound", [sound], {}))[0]
        playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, playing: !sound.playing}]);
      }
      // CONTROL : toggle loop mode
      else if(source.dataset.action == "sound-repeat") {
        if(sound.id) {
          playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, repeat: !sound.repeat}]);
        } else {
          $(source).attr("class", !sound.repeat ? "sound-control" : "sound-control inactive")
        }
      }
      // CONTROL : add to control board
      else if(source.dataset.action == "favorite") {
        new MoulinetteFavorite({path: sound.path, name: sound.name, label: sound.name, volume: sound.volume }).render(true)
      }
      // CONTROL : copy path to clipboard
      else if(source.dataset.action == "clipboard") {
        // put path into clipboard
        if(navigator.clipboard) {
          navigator.clipboard.writeText(sound.path)
          .catch(err => {
            console.warn("Moulinette Sounds | Not able to copy path into clipboard")
          });
          ui.notifications.info(game.i18n.localize("mtte.clipboardSoundSuccess"));
        } else {
          ui.notifications.warn(game.i18n.localize("mtte.clipboardUnsupported"));
        }
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
    const indexFileJSON = `index-${game.world.id}.json`

    // ACTION - CONFIGURE SOURCES
    if(classList.contains("configureSources")) {
      (new game.moulinette.applications.MoulinetteSources(this, ["sounds"], MoulinetteSounds.AUDIO_EXT)).render(true)
    }
    // ACTION - REFERENCES
    else if(classList.contains("customReferences")) {
      new Dialog({title: game.i18n.localize("mtte.customReferencesPacks"), buttons: {}}, { id: "moulinette-info", classes: ["info"], template: "modules/moulinette-sounds/templates/custom-references.hbs", width: 650, height: "auto" }).render(true)
    }
    // ACTION - HELP / HOWTO
    else if(classList.contains("howto")) {
      new game.moulinette.applications.MoulinetteHelp("sounds").render(true)
    }
    // ACTION - ACTIVATE PLAYLIST (not in use any more)
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
    // ACTION - DELETE PLAYLIST (not in use any more)
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
                updates.push({_id: sound.id, playing: false})
              }
            }
            if(updates.length > 0) {
              await playlist.updateEmbeddedDocuments("PlaylistSound", updates);
            }
            await playlist.delete()
          }
        },
        no: () => {}
      });
    }
    // ACTION - ADD ALL CHECKED TO SOUND BOARD
    else if (classList.contains("favoriteChecked")) {
      // prepare selected sounds
      let selected = []
      let isFirst = true
      const instance = this
      this.html.find(".checked").each(function(index) {
        const idx = this.closest(".sound").dataset.idx;
        const name = $(this).closest(".sound").find('.audio').text()
        const volume = $(this).closest(".sound").find('.sound-volume input').val()
        
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
        await MoulinetteSoundsUtil.downloadAsset(sel.soundData)
        sel.path = sel.soundData.path // retrieve new path
        delete sel.soundData          // delete soundData that is not used by FVTT
        SceneNavigation._onLoadProgress(game.i18n.localize("mtte.downloadingSounds"), Math.round((idx / selected.length)*100));
      }
      SceneNavigation._onLoadProgress(game.i18n.localize("mtte.downloadingSounds"),100);
      
      if(selected.length == 0) return;
      
      if (classList.contains("favoriteChecked")) {
        const paths = selected.length == 1 ? selected[0].path : selected.map( (sound, idx) => sound.path )
        const name = selected.length == 1 ? selected[0].name : game.i18n.localize("mtte.favoriteMultiple")
        const volume = selected[0].volume
        const label = selected[0].name
        new MoulinetteFavorite({path: paths, name: name, label: label, volume: volume }).render(true)
      }
    }
  }

  async onShortcut(type) {
    if(type == "soundpads") {
      (new game.moulinette.applications.MoulinetteSoundPads()).render(true)
    }
    else if(type == "soundboard") {
      (new MoulinetteSoundBoard()).render(true)
    }
  }
}
