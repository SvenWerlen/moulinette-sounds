/*************************
 * Moulinette Favorite
 *************************/
export class MoulinetteSoundPads extends FormApplication {

  static MOULINETTE_PLAYLIST  = "Tabletop Audio (Moulinette)"
  
  constructor(data) {
    super()

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
  
  async getData() {
    const user = await game.moulinette.applications.Moulinette.getUser()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id])

    let sounds = []
    const tabletopPack = index.packs.find(p => p.publisher == "Tabletop Audio" && p.name == "SoundPads")
    if(tabletopPack) {
      sounds = index.assets.filter(s => s.pack == tabletopPack.idx)
      for(const s of sounds) {
        s.name = MoulinetteSoundPads.cleanSoundName(s.filename.split("/").pop())
      }
    }

    // keep references for later usage
    this.sounds = sounds
    this.pack = tabletopPack
    this.folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(sounds, [tabletopPack]);

    // add ambience & music
    let musicList
    if(game.moulinette.cache.hasData("ttaMusic")) {
      musicList = game.moulinette.cache.getData("ttaMusic")
    } else {
      const music = await fetch(game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id + "/tta")
      musicList = await music.json()
      musicList.sort((a, b) => { return a.track_title.localeCompare(b.track_title) });
      game.moulinette.cache.setData("ttaMusic", musicList)
    }

    if(musicList.length > 0) {
      const list = []
      let idx = this.sounds.length+1
      for(const m of musicList) {
        list.push({ idx: idx, name: m.track_title, filename: m.link })
        this.sounds.push({ idx: idx++, name: m.track_title, filename: m.link })
      }
      this.folders["/Ambience & Music/"] = list
    }

    const keys = Object.keys(this.folders).sort()
    const assets = []
    for(const k of keys) {
      assets.push(`<div class="folder" data-path="${k}"><h2 class="expand"><i class="fas fa-folder"></i> ${k.slice(0, -1).split('/').pop() } (${this.folders[k].length})</h2><div class="assets">`)
      for(const a of this.folders[k]) {
        assets.push(`<div class="sound" data-idx="${a.idx}"><i class="fas fa-music"></i> <span class="audio">${a.name}${a.filename.includes("loop") ? ' <i class="fas fa-sync"></i>' : "" }</label></span></div>`)
      }
      assets.push("</div></div>")
    }

    return { assets, 'noAsset': this.sounds.length == 0, 'volume':  AudioHelper.volumeToInput(game.settings.get("moulinette", "soundpadVolume")) }
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

    // enable expand listeners
    html.find(".expand").click(this._onToggleExpand.bind(this));

    // play sound on click
    html.find(".sound").click(this._onPlaySound.bind(this));

    // toggle on right click
    html.find(".expand").mousedown(this._onMouseDown.bind(this))
    html.find(".sound").mousedown(this._onMouseDown.bind(this))

    // put focus on search
    html.find("#search").focus();

    // actions
    html.find('.action').click(this._onAction.bind(this))

    // keep in settings
    html.find('.sound-volume').change(event => this._onSoundVolume(event));

    // toggle visibility
    const parent = this
    html.find('.toggleVisibility').click(event => {
      parent.showAll = !parent.showAll
      parent.toggleVisibility()
      $(event.currentTarget).find("i").attr("class", parent.showAll ? "fas fa-eye" : "fas fa-eye-slash")
      parent._onSearch(event)
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
    const showAll = this.showAll
    // make all visible
    this.html.find(".folder").show().removeClass("hide")
    this.html.find(".sound").show().removeClass("hide")
    // show/hide
    const hidden = game.settings.get("moulinette", "soundpadHidden")
    const packId = this.pack.packId.toString()
    if(packId in hidden) {
      const filtered = hidden[packId]
      const sounds = this.sounds
      this.html.find(".folder").each(function(idx, f) {
        if(filtered.includes($(f).data('path'))) {
          $(f).addClass("hide")
          if(!showAll) {
            $(f).hide()
          }
        }
      })
      this.html.find(".sound").each(function(idx, s) {
        if(filtered.includes(sounds[$(s).data('idx')-1].filename)) {
          $(s).addClass("hide")
          if(!showAll) {
            $(s).hide()
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
      if(source.classList.contains("expand")) {
        const folder = $(source).closest('.folder')
        key = folder.data('path')
        if(key) {
          if(!this.showAll) {
            $(folder).toggle()
          }
          $(folder).toggleClass("hide")
        }
      } else {
        const idx = $(source).data('idx')
        if(idx && idx > 0 && idx <= this.sounds.length) {
          key = this.sounds[idx-1].filename
          if(!this.showAll) {
            $(source).toggle()
          }
          $(source).toggleClass("hide")
        }
      }

      if(!key) return;
      const hidden = game.settings.get("moulinette", "soundpadHidden")
      const packId = this.pack.packId.toString()
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

  async _onPlaySound(event) {
    event.preventDefault();
    const soundIdx = $(event.currentTarget).data('idx')

    // sounds
    if(soundIdx && soundIdx > 0 && soundIdx <= this.sounds.length) {
      const soundData = this.sounds[soundIdx-1]
      const url = soundData.pack ? `${this.pack.path}/${soundData.filename}` : soundData.filename

      // add to playlist
      let playlist = game.playlists.find( pl => pl.data.name == MoulinetteSoundPads.MOULINETTE_PLAYLIST )
      if(!playlist) {
        playlist = await Playlist.create({name: MoulinetteSoundPads.MOULINETTE_PLAYLIST, mode: -1})
      }

      let sound = playlist.sounds.find( s => s.path.startsWith(url) )
      // create sound if doesn't exist
      if(!sound) {
        sound = {}
        sound.name = soundData.pack ? MoulinetteSoundPads.cleanSoundName(soundData.filename.replaceAll("/", " | ")) : "Tabletopaudio | Music | " + soundData.name
        sound.volume = 1
        sound.repeat = soundData.pack ? soundData.filename.includes("loop") : true
        sound.path = url + "?" + this.pack.sas
        sound = (await playlist.createEmbeddedDocuments("PlaylistSound", [sound], {}))[0]
      }

      // adjust volume
      const volume = game.settings.get("moulinette", "soundpadVolume");

      // play sound (reset URL)
      playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, path: url + "?" + this.pack.sas, playing: !sound.data.playing, volume: volume}]);
    }
  }

  _onSearch(event) {
    //event.preventDefault();
    const text = this.html.find("#search").val()
    const searchTerms = text.split(" ")
    const parent = this

    const showAll = this.showAll
    const hidden = game.settings.get("moulinette", "soundpadHidden")
    const packId = this.pack.packId.toString()
    const filtered = packId in hidden ? hidden[packId] : []

    // get list of all matching sounds
    const matches = this.sounds.filter(s => {
      // by default, hide all "hidden" entries
      if(!showAll && filtered.includes(this.sounds[s.idx-1].filename)) {
        return false;
      }
      for( const f of searchTerms ) {
        if( s.name.toLowerCase().indexOf(f) < 0 ) {
          return false;
        }
      }
      return true
    })
    // get idx only (for fast filtering)
    const matchesIdx = matches.map(m => m.idx)

    // show/hide sounds
    this.html.find(".sound").each(function(idx, sound) {
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
      const folderHidden = filtered.includes(k)
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
    if(text.length > 0) {
      this.html.find('.assets').show()
      this.html.find(".folder h2 i").attr("class", "fas fa-folder-open")
    } else {
      this.html.find('.assets').hide()
      this.html.find(".folder h2 i").attr("class", "fas fa-folder")
    }

    // show warning if no matches
    if(count == 0) {
      this.html.find('.warning').show();
    } else {
      this.html.find('.warning').hide();
    }
  }
}
