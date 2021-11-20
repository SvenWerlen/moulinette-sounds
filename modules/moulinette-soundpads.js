/*************************
 * Moulinette Favorite
 *************************/
export class MoulinetteSoundPads extends FormApplication {

  static MOULINETTE_PLAYLIST  = "Tabletop Audio (Moulinette)"
  
  constructor(data) {
    super()
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

    const keys = Object.keys(this.folders).sort()
    const assets = []
    for(const k of keys) {
      assets.push(`<div class="folder" data-path="${k}"><h2 class="expand"><i class="fas fa-folder"></i> ${k.slice(0, -1).split('/').pop() } (${this.folders[k].length})</h2><div class="assets">`)
      for(const a of this.folders[k]) {
        assets.push(`<div class="sound" data-idx="${a.idx}"><i class="fas fa-music"></i> <span class="audio">${a.name}${a.filename.includes("loop") ? ' <i class="fas fa-sync"></i>' : "" }</label></span></div>`)
      }
      assets.push("</div></div>")
    }

    return { assets, 'noAsset': this.sounds.length == 0 }
  }


  /**
   * Implements listeners
   */
  activateListeners(html) {
    $("#controls").hide()
    $("#logo").hide()
    $("#navigation").hide()
    $("#players").hide()

    // keep html for later usage
    this.html = html

    // enable expand listeners
    html.find(".expand").click(this._onToggleExpand.bind(this));

    // close on right click
    html.find(".sidebar").mousedown(this._onMouseDown.bind(this))

    // play sound on click
    html.find(".sound").click(this._onPlaySound.bind(this));

    // put focus on search
    html.find("#search").focus();

    // actions
    html.find('.action').click(this._onAction.bind(this))

    // put focus on search
    if(Object.keys(this.folders).length === 0) {
      html.find(".error").show()
    } else {
      html.find("#search").on('input', this._onSearch.bind(this));
    }
  }

  _onMouseDown(event) {
    if(event.which == 3) {
      this.close()
    }
  }

  close() {
    super.close()
    $("#controls").show()
    $("#logo").show()
    $("#navigation").show()
    $("#players").show()
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
    if(soundIdx && soundIdx > 0 && soundIdx <= this.sounds.length) {
      const url = `${this.pack.path}/${this.sounds[soundIdx-1].filename}`
//       for( const a of game.audio.playing ) {
//         const sound = a[1]
//         if(sound.src.startsWith(url)) {
//           return sound.stop();
//         }
//       }
      //const sound = await AudioHelper.play({src: url, volume: 1, loop: false}, true);
      //game.audio.play(url + "?" + this.pack.sas, {volume: 1, loop: false});

      // add to playlist
      let playlist = game.playlists.find( pl => pl.data.name == MoulinetteSoundPads.MOULINETTE_PLAYLIST )
      if(!playlist) {
        playlist = await Playlist.create({name: MoulinetteSoundPads.MOULINETTE_PLAYLIST, mode: -1})
      }

      let sound = playlist.sounds.find( s => s.path.startsWith(url) )
      // create sound if doesn't exist
      if(!sound) {
        sound = {}
        sound.name = MoulinetteSoundPads.cleanSoundName(this.sounds[soundIdx-1].filename.replaceAll("/", " | "))
        sound.volume = 1
        sound.repeat = this.sounds[soundIdx-1].filename.includes("loop")
        sound.path = url + "?" + this.pack.sas
        sound = (await playlist.createEmbeddedDocuments("PlaylistSound", [sound], {}))[0]
      }
      // play sound (reset URL)
      playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, path: url + "?" + this.pack.sas, playing: !sound.data.playing}]);
    }
  }

  _onSearch(event) {
    //event.preventDefault();
    const text = this.html.find("#search").val()
    const searchTerms = text.split(" ")
    const parent = this

    // get list of all matching sounds
    const matches = this.sounds.filter(s => {
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
      if(matchesIdx.includes($(sound).data('idx'))) {
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
      if(sounds.length == 0) {
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
