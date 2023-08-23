/*************************
 * Moulinette SoundBoard (Edit Sound)
 *************************/
export class MoulinetteSoundBoardSound extends FormApplication {
  
  static WIDTH = {10: 420, 15: 630, 20: 840}
  
  constructor(data, slot, parent) {
    super()
    this.data = data
    this.slot = slot
    this.parent = parent

    if(!this.data.volume) {
      this.data.volume = 1.0
    }
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-soundboard-sound",
      classes: ["mtte", "soundboard"],
      title: game.i18n.localize("mtte.favorite"),
      template: "modules/moulinette-sounds/templates/soundboard-sound.hbs",
      width: 500,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  getData() {
    const audio = []
    const settings = game.settings.get("moulinette", "soundboard-advanced")
    this.data.path.forEach(p => audio.push({'name' : decodeURIComponent(p.split('/').pop()), 'path': p}))
    return {
      data: this.data, 
      audio: audio,
      canBrowse: game.permissions.FILES_BROWSE.includes(game.user.role),
      canUpload: game.permissions.FILES_UPLOAD.includes(game.user.role),
      multiple: Array.isArray(this.data.path), 
      volume: AudioHelper.volumeToInput(this.data.volume),
      exists: Object.keys(settings).includes("audio-" + this.slot),
      size1: !this.data.size || this.data.size == 1,
      size2: this.data.size == 2,
      size3: this.data.size == 3
    }
  }
  
  async _onClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    if(button.classList.contains("cancel")) {
      this.close()
    }
    else if(button.classList.contains("browse")) {
      const icon = this.html.find("input.icon2").val()
      new FilePicker({callback: this._onPathChosen.bind(this), current: icon ? icon : "moulinette/images/", type: "image"}).render(true);
    }
    else if(button.classList.contains("browseSound")) {
      new FilePicker({callback: this._onAudioChosen.bind(this), type: "audio"}).render(true);
    }
    else if(button.classList.contains("browseGameIcon")) {
      //const icon = this.html.find("input.icon2").val()
      const picker = game.moulinette.applications.MoulinetteGameIconsPicker
      if(!picker) {
        return ui.notifications.error(game.i18n.localize("mtte.errorGameIconModule"));
      }
      if(!game.permissions.FILES_UPLOAD.includes(game.user.role)) {
        return ui.notifications.error(game.i18n.localize("mtte.filepickerCanNotUpload"));
      }

      picker.browse("", (path) => {
        this._onPathChosen(path)
      })
    }
    else if(button.classList.contains("delete")) {
      // prompt confirmation
      let settings = game.settings.get("moulinette", "soundboard-advanced")
      const slot = `#${this.data.idx}`
      const dialogDecision = await Dialog.confirm({
        title: game.i18n.localize("mtte.deleteFavorite"),
        content: game.i18n.format("mtte.deleteFavoriteContent", { from: slot }),
      })
      if(!dialogDecision) return;

      delete settings["audio-" + this.slot]
      await game.settings.set("moulinette", "soundboard-advanced", settings)
      this.close()
      if(this.parent) {
        this.parent.render()
      }
    }
    else if(button.classList.contains("save")) {
      const settings = game.settings.get("moulinette", "soundboard-advanced")
      if(this.data.path.length == 0) {
        return ui.notifications.error(game.i18n.localize("mtte.errorSoundboardNoAudio"));
      }

      // remove icon size for icon button
      if(this.data.icon && this.data.size) {
        delete this.data.size
      }

      let audio = duplicate(this.data)
      delete audio["id"]
      delete audio["idx"]
      settings["audio-" + this.slot] = audio
      await game.settings.set("moulinette", "soundboard-advanced", settings)
      this.close()
      if(this.parent) {
        this.parent.render()
      }
    }
  }
  
  /**
   * User selected a path (as image icon)
   */
  _onPathChosen(path) {
    this.html.find("input.icon2").val(path)
    this.html.find(".icon").val("")
    this.data.icon = path
    this.data.faIcon = false
    this._updateAudioButtonLayout()
  }

  _onAudioChosen(path) {
    if(path) {
      this.data.path.push(path)
      this.render()
    }
  }
  
  async _onTogglePreview(event) {
    let sound = null
    
    if(this.data.path == 0) return;

    // pause sound if playing
    if(this.currentlyPlaying && !this.currentlyPlaying.paused) {
      this.currentlyPlaying.pause()
      this.currentlyPlaying.currentTime = 0;
      this.currentlyPlaying = null
      return
    }
    let idx = 0
    if(this.data.path.length > 1) {
      idx = Math.floor((Math.random() * this.data.path.length));
    }
    sound = document.getElementById("previewSound" + idx)
    this.currentlyPlaying = sound
    
    if(sound.paused) {
      sound.play();
    }
    else {
      sound.pause();
      sound.currentTime = 0;
    }
  }
  
  async _onSoundVolume(event) {
    event.preventDefault();
    const slider = event.currentTarget;
    const volume = AudioHelper.inputToVolume(slider.value)
    this.html.find("audio").prop("volume", volume);
    this.data.volume = volume
  }

  /**
   * Update Button Layout according to the current settings
   */
  _updateAudioButtonLayout() {
    const button = this.html.find(".sounds .snd")
    // reset size
    button.removeClass("size1")
    button.removeClass("size2")
    button.removeClass("size3")
    // no sound selected
    if(this.data.path.length == 0) {
      button.removeClass("used")
      button.addClass("unused")
      button.text(this.data.idx)
    }
    else {
      button.addClass("used")
      button.removeClass("unused")
      if(this.data.icon) {
        if(this.data.faIcon) {
          button.html(`<i class="${this.data.icon}" title="${this.data.name}"></i>`)
        } else {
          button.html(`<img class="icon" title="${this.data.name}" src="${this.data.icon}"/>`)
        }
      } else {
        // size only for text button
        if(this.data.size >= 2) {
          button.addClass("size" + this.data.size)
        }
        if(this.data.name && this.data.name.length > 0) {
          button.text(this.data.name)
        } else {
          button.text(this.data.idx)
        }
      } 
    }
  }

  activateListeners(html) {
    const parent = this
    this.html = html

    IconPicker.Init({
      // Required: You have to set the path of IconPicker JSON file to "jsonUrl" option. e.g. '/content/plugins/IconPicker/dist/iconpicker-1.5.0.json'
      jsonUrl: "/modules/moulinette-core/iconpicker/iconpicker.json",
      // Optional: Change the buttons or search placeholder text according to the language.
      searchPlaceholder: game.i18n.localize("mtte.searchIcon"),
      showAllButton: game.i18n.localize("mtte.showAll"),
      cancelButton: game.i18n.localize("mtte.cancel"),
      noResultsFound: game.i18n.localize("mtte.noResultsFound"),
      // v1.5.0 and the next versions borderRadius: '20px', // v1.5.0 and the next versions
    });
    IconPicker.Run('#GetIconPickerEdit', function() {
      html.find(".icon2").val("")
      parent.data.icon = parent.html.find("input.icon").val()
      parent.data.faIcon = parent.data.icon.length > 0
      parent._updateAudioButtonLayout()
    });

    html.find("button").click(this._onClick.bind(this))
    html.find(".snd").click(this._onTogglePreview.bind(this))
    html.find('.sound-volume').change(event => this._onSoundVolume(event));
    
    html.find('.audiofile').click(ev => {
      ev.preventDefault()
      const idx = $(ev.currentTarget).data("idx")
      if(idx >= 0 && idx < this.data.path.length) {
        parent.data.path.splice(idx, 1)
        parent.render(true)
      }  
    })
    html.find("audio").prop("volume", AudioHelper.volumeToInput(this.data.volume))

    html.find("input.shortText").on('input',function(e){
      const txt = $(e.currentTarget).val()
      parent.data.name = txt
      parent._updateAudioButtonLayout()
    });

    html.find("#IconInputEdit").change((e) => {
      html.find(".icon2").val("")
      const txt = $(e.currentTarget).val()
      parent.data.icon = txt
      parent.data.faIcon = txt.length > 0
      parent._updateAudioButtonLayout()
    })

    html.find(".icon2").change((e) => {
      html.find(".icon").val("")
      const txt = $(e.currentTarget).val()
      parent.data.icon = txt
      parent.data.faIcon = false
      parent._updateAudioButtonLayout()
    })

    html.find(".size1").click(ev => {
      parent.data.size = 1
      parent._updateAudioButtonLayout()
      html.find(".size1").addClass("selected")
      html.find(".size2").removeClass("selected")
      html.find(".size3").removeClass("selected")
    })
    html.find(".size2").click(ev => {
      if(this.data.icon) {
        return ui.notifications.warn(game.i18n.localize("mtte.errorSoundboardSizeForIcon"));
      }
      html.find(".size1").removeClass("selected")
      html.find(".size2").addClass("selected")
      html.find(".size3").removeClass("selected")
      parent.data.size = 2
      parent._updateAudioButtonLayout()
    })
    html.find(".size3").click(ev => {
      if(this.data.icon) {
        return ui.notifications.warn(game.i18n.localize("mtte.errorSoundboardSizeForIcon"));
      }
      html.find(".size1").removeClass("selected")
      html.find(".size2").removeClass("selected")
      html.find(".size3").addClass("selected")
      parent.data.size = 3
      parent._updateAudioButtonLayout()
    })
  }
  
}
