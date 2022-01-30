import { MoulinetteBBCClient } from "./moulinette-bbc-client.js"
import { MoulinetteFavorite } from "./moulinette-favorite.js"
import { MoulinetteSoundBoard } from "./moulinette-soundboard.js"

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
    
    // 5$, 10$, 20$, 50$ can download sounds
    const TTA = ["362213", "362214", "362215", "362216"]
    const three = game.moulinette.user.pledges ? game.moulinette.user.pledges.find(p => p.id == "362212") : null
    const fiveOrMore = game.moulinette.user.pledges ? game.moulinette.user.pledges.find(p => TTA.includes(p.id)) : null
    // 3$ but not 5$+? => filter assets out
    const TTAPack = three && !fiveOrMore ? index.packs.find(p => p.publisher == "Tabletop Audio" && p.isRemote) : null
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
   * Generate a new asset (HTML) for the given result and idx
   */
  generateAsset(playlist, r, idx, selSound) {
    const FileUtil = game.moulinette.applications.MoulinetteFileUtil
    const URL = this.assetsPacks[r.pack].isRemote ? "" : FileUtil.getBaseURL()
    const pack   = this.assetsPacks[r.pack]
    
    const repeatDefault = game.settings.get("moulinette-sounds", "defaultRepeatOn")
    
    r.sas = pack.sas ? "?" + pack.sas : ""
    r.assetURL = pack.special ? r.assetURL : (r.filename.match(/^https?:\/\//) ? FileUtil.encodeURL(r.filename) : `${URL}${this.assetsPacks[r.pack].path}/${FileUtil.encodeURL(r.filename)}`)
    const sound  = playlist ? playlist.sounds.find(s => s.path == r.assetURL) : null
    const name   = game.moulinette.applications.Moulinette.prettyText(r.title && r.title.length > 0 ? r.title : r.filename.split("/").pop().replace(".ogg","").replace(".mp3","").replace(".wav","").replace(".webm","").replace(".m4a",""))
    const icon   = sound && sound.data.playing ? "fa-square" : "fa-play"
    const repeat = r.loop || (sound ? (sound.data.repeat ? "" : "inactive") : (repeatDefault ? "" : "inactive"))
    const volume = sound ? sound.data.volume : 0.5
    const selected = selSound && r.assetURL == selSound.sound.assetURL ? "selected" : ""

    const durHr = Math.floor(r.duration / (3600))
    const durMin = Math.floor((r.duration - 3600*durHr)/60)
    const durSec = r.duration % 60
    const duration = (durHr > 0 ? `${durHr}:${durMin.toString().padStart(2,'0')}` : durMin.toString()) + ":" + durSec.toString().padStart(2,'0')

    const shortName = name.length <= 40 ? name : name.substring(0,40) + "..."

    let html = `<div class="sound ${selected}" data-path="${r.assetURL}" data-filename="${r.filename}" data-idx="${idx}">` +
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
      this.searchResults = results.data.results.map((r) => {
        return { pack: pack, assetURL: `https://sound-effects-media.bbcrewind.co.uk/mp3/${r.id}.mp3`, filename: r.description, duration: Math.round(r.duration/1000)}
      })
    }
    // normal cases
    else {
      searchTerms = searchTerms ? searchTerms.split(" ") : []
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
    const selSound = game.moulinette.cache.getData("selSound")

    // header (hidden audio for preview)
    assets.push("<audio id=\"prevSound\"></audio>")

    // view #1 (all mixed)
    if(viewMode == "tiles") {
      let idx = 0
      this.searchResults.sort((a,b) => a.filename.split("/").pop().localeCompare(b.filename.split("/").pop()))
      for(const r of this.searchResults) {
        idx++
        assets.push(this.generateAsset(playlist, r, idx, selSound))
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
          assets.push(this.generateAsset(playlist, a, a.idx, selSound))
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
    
    this.html.find('.sound-volume input').change(event => this._onSoundVolume(event));
    this.html.find(".sound-controls a").click(this._onSoundControl.bind(this))
    this.html.find(".draggable").click(this._onToggleSelect.bind(this))
    this.html.find(".sound").mousedown(this._onMouseDown.bind(this))
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
    const FileUtil = game.moulinette.applications.MoulinetteFileUtil
    if(!data.pack.isRemote || data.pack.special) {
      const baseURL = FileUtil.getBaseURL()
      data.path = data.sound.assetURL
    }
    else {
      await FileUtil.downloadAssetDependencies(data.sound, data.pack, "sounds")
      data.path = FileUtil.getBaseURL() + FileUtil.getMoulinetteBasePath("sounds", data.pack.publisher, data.pack.name) + FileUtil.encodeURL(data.sound.filename)
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
        sound.name = game.moulinette.applications.Moulinette.prettyText(result.filename.replace("/"," | ").replace(".ogg","").replace(".mp3","").replace(".wav","").replace(".webm","").replace(".m4a",""))
        sound.volume = AudioHelper.inputToVolume($(source.closest(".sound")).find(".sound-volume input").val())
        sound.repeat = !$(source.closest(".sound")).find("a[data-action='sound-repeat']").hasClass('inactive')
      }
      // CONTROL : preview sound
      if(source.dataset.action == "sound-preview") {
        const previewSound = document.getElementById("prevSound")
        if(previewSound.paused) {
          previewSound.src = sound.path
          previewSound.play();
        }
        else {
          previewSound.pause();
          previewSound.currentTime = 0;
        }
      }
      // CONTROL : toggle play
      else if(source.dataset.action == "sound-play") {
        // add sound to playlist before playing it (unless already exists)
        if(!sound.id) sound = (await playlist.createEmbeddedDocuments("PlaylistSound", [sound], {}))[0]
        playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, playing: !sound.data.playing}]);
      }
      // CONTROL : toggle loop mode
      else if(source.dataset.action == "sound-repeat") {
        if(sound.id) {
          playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, repeat: !sound.data.repeat}]);
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

    // ACTION - INDEX
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
      // append durations from all sounds
      const audio = new Audio()
      audio.preload = "metadata"
      const promises = []
      for(const c of publishers) {
        for(const p of c.packs) {
          const durations = []
          for(const a of p.assets) {
            audio.src = `${p.path}/${FileUtil.encodeURL(a)}`
            const promise = new Promise( (resolve,reject)=>{
              audio.onloadedmetadata = function() {
                resolve(audio.duration);
              }
              audio.onerror = function() {
                console.warn(`Moulinette Sounds | Audio file '${decodeURIComponent(audio.src)}' seems corrupted`)
                resolve(0.0)
              }
            });
            const duration = await promise
            durations.push(Math.round(duration))
          }
          p.durations = durations
        }
      }
      await FileUtil.upload(new File([JSON.stringify(publishers)], "index.json", { type: "application/json", lastModified: new Date() }), "index.json", "/moulinette/sounds", MoulinetteSounds.FOLDER_CUSTOM_SOUNDS, true)
      ui.notifications.info(game.i18n.localize("mtte.indexingDone"));
      // clear cache
      game.moulinette.cache.clear()
      this.clearCache()
      return true
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
        await MoulinetteSounds.downloadAsset(sel.soundData)
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
