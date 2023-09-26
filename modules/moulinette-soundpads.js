import { MoulinetteSoundsUtil } from "./moulinette-sounds-util.js"

/*************************
 * Moulinette SoundPads
 *************************/
export class MoulinetteSoundPads extends FormApplication {

  static MOULINETTE_PLAYLIST  = "#CREATOR# (Moulinette)"
  static CREATORS = {
    tabletopaudio : "Tabletop Audio",
    michaelghelfi : "Michael Ghelfi"
  }
  
  constructor(data) {
    super()

    this.creator = "tabletopaudio" // default choice
    const savedCreator = game.settings.get("moulinette-sounds", "soundpadCreator")
    if(savedCreator && savedCreator in MoulinetteSoundPads.CREATORS) {
      this.creator = savedCreator
    }
    
    this.showAll = false
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-soundpads",
      classes: ["mtte", "soundpads"],
      title: game.i18n.localize("mtte.soundpads"),
      template: "modules/moulinette-sounds/templates/soundpads.hbs",
      top: 0,
      left: 0,
      width: 250,
      height: 30000, // force 100%
      dragDrop: [{dragSelector: ".draggable"}],
      resizable: true,
      minimizable: false,
      closeOnSubmit: true,
      submitOnClose: false
    });
  }

  static cleanSoundName(filename) {
    let soundName = filename.replaceAll(".ogg", "").replaceAll("loop", "").replaceAll("_", " ").replaceAll("-", " ").replace("/", " / ")

    // uppercase first letter of each word
    soundName = soundName.split(" ").map((word) => {
        return word.length == 0 ? "" : word[0].toUpperCase() + word.substring(1);
    }).join(" ");

    return soundName
  }

  /**
   * Formats the duration as string
   */
  static formatDuration(seconds) {
    seconds = Math.round(seconds)
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(seconds / 3600);
    seconds = seconds % 60;
    
    // Format MM:SS for duration less than 1 hour
    if (hours === 0) {
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
  }
  
  async getData() {
    const user = await game.moulinette.applications.Moulinette.getUser() // don't remove (forces patreon integration)
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id])

    const categories = []
    let sounds = []

    const ttaPacks = index.packs.filter(p => p.publisher == MoulinetteSoundPads.CREATORS[this.creator])
    const packIds = ttaPacks.map(p => p.idx)
    sounds = index.assets.filter(s => packIds.includes(s.pack))
    for(const s of sounds) {
      s.name = s.title ? s.title : MoulinetteSoundPads.cleanSoundName(s.filename.split("/").pop())
      if(s.cat) {
        const categs = []
        for(const c of s.cat) {
          const categ = c.toLowerCase()
          categs.push(categ)
          if(!categories.includes(categ)) {
            categories.push(categ)
          }
        }
        s.cat = categs
      } 
    }

    // keep references for later usage
    this.sounds = sounds
    this.packs = ttaPacks
    this.folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(sounds, ttaPacks, true);
    
    // music without folder should be alternates => try to match them
    if("/" in this.folders) {
      for(const snd of this.folders["/"]) {
        // find match based on prefix
        const idx = snd.filename.indexOf("_")
        if(idx <= 0) continue
        const prefix = snd.filename.substring(0, idx)
        Object.keys(this.folders).forEach(key => {
          const match = this.folders[key].find(s => s.filename.indexOf(`/${prefix}_`) >= 0)
          if(match) {
            if(!match.alt) {
              match.alt = [snd]
            } else {
              match.alt.push(snd)
            }
          }
          return
        });
      }
    }
    delete this.folders["/"]

    const keys = Object.keys(this.folders).sort()
    const assets = []
    for(const k of keys) {
      const folderName = k.slice(0, -1).split('/').pop().replace(/\([^\)]+\)/, "")
      assets.push(`<div class="folder" data-path="${k}"><h2 class="expand"><i class="fas fa-folder"></i> ${folderName} (${this.folders[k].length})</h2><div class="assets">`)
      // sort by order, then name
      const sounds = this.folders[k].sort((a,b) => a.order != b.order ? a.order - b.order : a.name.localeCompare(b.name))
      for(const a of sounds) {
        let variants = 0
        let variantsHTML = ""
        if(a.alt) {
          variantsHTML += MoulinetteSoundPads.generateSoundAltHTML(a, a)
          for(const alt of a.alt) {
            variants++
            variantsHTML += MoulinetteSoundPads.generateSoundAltHTML(a, alt)
          }
        }

        const tagsHTML = a.tags ? `title="${a.tags}"` : ""
        const categHTML = a.cat ? `data-cat="${a.cat}"` : ""
        const soundHTML = MoulinetteSoundPads.generateSoundHTML(a, tagsHTML, categHTML, variants) + variantsHTML
        assets.push(soundHTML)
      }
      assets.push("</div></div>")
    }

    return { 
      assets, 
      categories,
      creator: this.creator,
      'noAsset': this.sounds.length == 0, 
      'volume':  AudioHelper.volumeToInput(game.settings.get("moulinette", "soundpadVolume")) 
    }
  }

  /**
   * Generates HTML for 1 single sound
   */
  static generateSoundHTML(a, tagsHTML, categHTML, variants) {
    return `<div class="sound ${ variants > 0 ? "expandable" : "draggable" }" data-idx="${a.idx}"><i class="fas fa-music"></i>&nbsp;` +
      `<span class="audio" ${tagsHTML} ${categHTML}>${a.name}${a.filename.toLowerCase().includes("loop") ? ' <i class="fas fa-sync fa-xs"></i>' : "" }` +
      (variants > 0 ? ` (${variants}) <i class="exp fa-solid fa-angles-down"></i>` : "") +
      `</span><span class="duration">${MoulinetteSoundPads.formatDuration(a.duration)}</span> </div>`
  }

  /**
   * Generates HTML for 1 single alternate sound
   */
  static generateSoundAltHTML(orig, alt) {
    const regex = /\(([^\)]+)\)/g; // extract text in parenthesis
    const result = regex.exec(alt.name);
    const name = result ? result[1] : alt.name
    return `<div class="sound draggable alt" data-parent="${orig.idx}" data-idx="${alt.idx}"><i class="fa-solid fa-compact-disc"></i>&nbsp;` +
      `<span class="audio">${name}${alt.filename.toLowerCase().includes("loop") ? ' <i class="fas fa-sync"></i>' : "" }` +
      `</span><span class="duration">${MoulinetteSoundPads.formatDuration(alt.duration)}</span> </div>`
  }


  /**
   * Implements listeners
   */
  activateListeners(html) {
    if(game.settings.get("moulinette-sounds", "soundboardHideUI")) {
      $("#controls").hide()
      $("#logo").hide()
      $("#navigation").hide()
      $("#players").hide()
    }

    // keep html for later usage
    this.html = html
    const parent = this

    // enable expand listeners
    html.find(".expand").click(this._onToggleExpand.bind(this));

    // play sound on click
    html.find(".sound.draggable").click(this._onPlaySound.bind(this));

    // show alternates sounds
    html.find(".sound.alt").hide()
    html.find(".sound.expandable").click(ev => {
      const icon = $(ev.currentTarget).find("i.exp")
      const idx = $(ev.currentTarget).data("idx")
      if(icon.hasClass("fa-angles-down")) {
        html.find(`[data-parent='${idx}']`).show()
        icon.removeClass("fa-angles-down")
        icon.addClass("fa-angles-up")
      } else {
        html.find(`[data-parent='${idx}']`).hide()
        icon.removeClass("fa-angles-up")
        icon.addClass("fa-angles-down")
      }      
    });

    // toggle on right click
    html.find(".expand").mousedown(this._onMouseDown.bind(this))
    html.find(".sound:not(.alt)").mousedown(this._onMouseDown.bind(this))

    // put focus on search
    html.find("#search").focus();

    // actions
    html.find('.action').click(this._onAction.bind(this))

    // creators' tab
    html.find('.othersoundpads a').click(ev => {
      ev.preventDefault()
      const link = ev.currentTarget
      for(const creatorKey of Object.keys(MoulinetteSoundPads.CREATORS)) {
        if(link.classList.contains(creatorKey)) {  
          this.creator = creatorKey
          game.settings.set("moulinette-sounds", "soundpadCreator", creatorKey)
          this.render(true)
        }
      }
    })

    // categories
    html.find(".categories a").click(ev => {
      ev.preventDefault();
      const cat = $(ev.currentTarget).data("id")
      html.find(".categories a").removeClass("selected")
      parent.category = parent.category == cat ? null : cat
      // highlight selected
      if(parent.category) {
        $(ev.currentTarget).addClass("selected")
      }
      parent._onSearch(ev, false)
    })

    // patreon authentication
    html.find(".mouAuthenticate").click(ev => { 
      ev.preventDefault();
      new game.moulinette.applications.MoulinettePatreon(parent).render(true); 
      return false; 
    })

    // keep in settings
    html.find('.sound-volume').change(event => this._onSoundVolume(event));

    // toggle visibility
    html.find('.toggleVisibility').click(event => {
      parent.showAll = !parent.showAll
      parent.toggleVisibility()
      $(event.currentTarget).find("i").attr("class", parent.showAll ? "fas fa-eye" : "fas fa-eye-slash")
      parent._onSearch(event, false)
    })

    // put focus on search
    if(Object.keys(this.folders).length === 0) {
      html.find(".error").show()
    } else {
      html.find("#search").on('input', this._onSearch.bind(this));
    }

    this.toggleVisibility()
  }

  /**
   * Show or hide entries based on settings
   */
  toggleVisibility() {
    if(!this.packs || !this.sounds) return;
    const showAll = this.showAll
    // make all visible
    this.html.find(".folder").show().removeClass("mtteHide")
    this.html.find(".sound:not(.alt)").show()
    this.html.find(".sound").removeClass("mtteHide")
    // show/hide
    const hidden = game.settings.get("moulinette", "soundpadHidden")
    const packIds = this.packs.map(p => p.packId.toString())
    
    // toggle visibility (files)
    for(const packId of packIds) {
      if(packId in hidden) {
        const filtered = hidden[packId]
        const sounds = this.sounds
        const parent = this
        this.html.find(".sound:not(.alt)").each(function(idx, s) {
          const sndIdx = $(s).data('idx')
          if(filtered.includes(sounds[sndIdx-1].filename)) {
            $(s).addClass("mtteHide")
            parent.html.find(`.sound.alt[data-parent='${sndIdx}']`).addClass("mtteHide")
            if(!showAll) {
              $(s).hide()
              parent.html.find(`.sound.alt[data-parent='${sndIdx}']`).hide()
            }
          }
        })
      }
    }

    // toggle visibility (folders)
    if('folders' in hidden) {
      const filtered = hidden['folders']
      this.html.find(".folder").each(function(idx, f) {
        if(filtered.includes($(f).data('path'))) {
          $(f).addClass("mtteHide")
          if(!showAll) {
            $(f).hide()
          }
        }
      })
    }
    
  }

  _onSoundVolume(event) {
    event.preventDefault();
    const slider = event.currentTarget;

    // store as setting
    const volume = AudioHelper.inputToVolume(slider.value);
    if (game.user.isGM) {
      game.settings.set("moulinette", "soundpadVolume", volume);
    }
  }

  async _onMouseDown(event) {
    if(event.which == 3) {
      const source = event.currentTarget
      let key = null
      let pack = null
      if(source.classList.contains("expand")) {
        const folder = $(source).closest('.folder')
        key = folder.data('path')
        if(key) {
          if(!this.showAll) {
            $(folder).toggle()
          }
          $(folder).toggleClass("mtteHide")
        }
      } else {
        const idx = $(source).data('idx')
        if(idx && idx > 0 && idx <= this.sounds.length) {
          key = this.sounds[idx-1].filename
          pack = this.packs.find(p => p.idx == this.sounds[idx-1].pack)
          $(source).toggleClass("mtteHide")
          this.html.find(`.sound.alt[data-parent='${idx}']`).toggleClass("mtteHide")
          if(!this.showAll) {
            $(source).toggle()
            this.html.find(`.sound.alt[data-parent='${idx}']`).hide()
          }
        }
      }

      if(!key) return;
      const hidden = game.settings.get("moulinette", "soundpadHidden")

      // hide 1 single element (pack not null) or entire folder (pack null)
      const packId = pack ? pack.packId.toString() : "folders"
      if(!(packId in hidden)) {
        hidden[packId] = []
      }
      if(hidden[packId].includes(key)) {
        const idx = hidden[packId].indexOf(key)
        hidden[packId].splice(idx, 1)
      } else {
        hidden[packId].push(key)
      }
      
      await game.settings.set("moulinette", "soundpadHidden", hidden)
    }
  }

  close() {
    super.close()
    if(game.settings.get("moulinette-sounds", "soundboardHideUI")) {
      $("#controls").show()
      $("#logo").show()
      $("#navigation").show()
      $("#players").show()
    }
  }

  /**
   * Show/hide assets in one specific folder
   */
  _onToggleExpand(event) {
    event.preventDefault();
    const source = event.currentTarget
    const folderEl = $(source).closest('.folder')
    const assets = folderEl.find(".assets")
    assets.toggle()
    folderEl.find("h2 i").attr("class", assets.css('display') == 'none' ? "fas fa-folder" : "fas fa-folder-open")
  }

  /**
   * Show/hide assets in one specific folder
   */
  _onAction(event) {
    event.preventDefault();
    const source = event.currentTarget
    if(source.classList.contains("refresh-access")) {
      console.log("To be implemented!")
    }
  }


  _onDragStart(event) {
    const soundIdx = $(event.currentTarget).data('idx')

    if(MoulinetteSoundsUtil.noTTADownload()) {
      return console.warn("MoulinetteSounds | " + game.i18n.localize("mtte.ttaWarning"))
    }

    // sounds
    if(soundIdx && soundIdx > 0 && soundIdx <= this.sounds.length) {
      const soundData = this.sounds[soundIdx-1]
      const pack = duplicate(this.packs.find(p => p.idx == soundData.pack))
      const sound = duplicate(soundData)
      sound.sas = "?" + pack.sas

      const dragData = {
        source: "mtte",
        type: "Sound",
        sound: sound,
        pack: pack,
        volume: game.settings.get("moulinette", "soundpadVolume"),
        repeat: soundData.pack ? soundData.filename.toLowerCase().includes("loop") : true
      };

      dragData.source = "mtte"
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }
  }



  async _onPlaySound(event) {
    event.preventDefault();
    const soundIdx = $(event.currentTarget).data('idx')

    // sounds
    if(soundIdx && soundIdx > 0 && soundIdx <= this.sounds.length) {
      const soundData = this.sounds[soundIdx-1]
      const pack = this.packs.find(p =>  p.idx == soundData.pack)
      let url = soundData.pack ? `${pack.path}/${soundData.filename}` : soundData.filename

      // add to playlist
      const playlistName = MoulinetteSoundPads.MOULINETTE_PLAYLIST.replace("#CREATOR#", MoulinetteSoundPads.CREATORS[this.creator])
      let playlist = game.playlists.find( pl => pl.name == playlistName )
      if(!playlist) {
        playlist = await Playlist.create({name: playlistName, mode: -1})
      }

      // download sound (unless user doesn't support TTA with appropriate tier)
      const downloadSounds = game.settings.get("moulinette-sounds", "soundpadDownloadSounds")
      if(downloadSounds && !MoulinetteSoundsUtil.noTTADownload()) {
        const data = {
          pack: duplicate(pack),
          sound: { filename: soundData.filename, sas: "?" + pack.sas }
        }

        await MoulinetteSoundsUtil.downloadAsset(data)
        url = data.path
      }

      let sound = playlist.sounds.find( s => s.path.startsWith(url) )
      // create sound if doesn't exist
      if(!sound) {
        sound = {}
        sound.name = MoulinetteSoundPads.cleanSoundName(soundData.filename.replaceAll("/", " | "))
        sound.volume = 1
        sound.repeat = soundData.pack ? soundData.filename.toLowerCase().includes("loop") : true
        sound.path = url + (!downloadSounds || MoulinetteSoundsUtil.noTTADownload() ? "?" + pack.sas : "")
        sound = (await playlist.createEmbeddedDocuments("PlaylistSound", [sound], {}))[0]
      }

      // adjust volume
      const volume = game.settings.get("moulinette", "soundpadVolume");

      // play sound (reset URL)
      playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, path: sound.path, playing: !sound.playing, volume: volume}]);

      // show warning
      if(MoulinetteSoundsUtil.noTTADownload()) {
        if(!game.settings.get("moulinette-sounds", "soundpadHideTTAWarning")) {
          ui.notifications.warn(game.i18n.localize("mtte.ttaWarning"))
        }
        console.warn("MoulinetteSounds | " + game.i18n.localize("mtte.ttaWarning"))
      }
    }
  }

  _onSearch(event, expandCollapse = true) {
    //event.preventDefault();
    const text = this.html.find("#search").val()
    const searchTerms = text.split(" ")
    
    const showAll = this.showAll
    const hidden = game.settings.get("moulinette", "soundpadHidden")
    
    // build list of filtered entries
    let filtered = []
    const folderFilterd = "folders" in hidden ? hidden["folders"] : []
    this.packs.forEach( p => { 
      if (p.packId.toString() in hidden) { 
        filtered = filtered.concat(hidden[p.packId.toString()]) 
      } 
    })

    // get list of all matching sounds
    const matches = this.sounds.filter(s => {
      // by default, hide all "hidden" entries
      if(!showAll && filtered.includes(this.sounds[s.idx-1].filename)) {
        return false;
      }
      // filter by category
      if(this.category && !(s.cat && s.cat.includes(this.category.toLowerCase()))) {
        return false;
      }
      for( const f of searchTerms ) {
        if( s.name.toLowerCase().indexOf(f) < 0 && (!s.tags || s.tags.toLowerCase().indexOf(f) < 0)) {
          return false;
        }
      }
      return true
    })
    // get idx only (for fast filtering)
    const matchesIdx = matches.map(m => m.idx)

    // show/hide sounds
    this.html.find(".sound:not(.alt)").each(function(idx, sound) {
      const match = matchesIdx.includes($(sound).data('idx'))
      if(match) {
        $(sound).show()
      } else {
        $(sound).hide()
      }
    })

    // update folder counts
    let count = 0
    const keys = Object.keys(this.folders).sort()
    for(const k of keys) {
      const sounds = this.folders[k].filter(s => matchesIdx.includes(s.idx))
      const folder = this.html.find(`[data-path='${k}']`)
      const folderHidden = folderFilterd.includes(k)
      if(sounds.length == 0 || (!showAll && folderHidden)) {
        folder.hide()
      } else {
        // replace the cound inside the ()
        const h2 = folder.find('h2');
        h2.html(h2.html().replace(/^(.*\()\d+(\).*)$/, `$1${sounds.length}$2`));
        folder.show()
        count += sounds.length
      }
    }

    // open/close all folders
    if(expandCollapse) {
      if(text.length > 0) {
        this.html.find('.assets').show()
        this.html.find(".folder h2 i").attr("class", "fas fa-folder-open")
      } else {
        this.html.find('.assets').hide()
        this.html.find(".folder h2 i").attr("class", "fas fa-folder")
      }
    }

    // show warning if no matches
    if(count == 0) {
      this.html.find('.warning').show();
    } else {
      this.html.find('.warning').hide();
    }
  }
}
