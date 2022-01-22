/*************************
 * Moulinette Favorite
 *************************/
export class MoulinetteFavorite extends FormApplication {
  
  static WIDTH = {10: 420, 15: 630, 20: 840}
  
  constructor(data, parent) {
    super()
    this.data = data
    this.parent = parent
    if(this.data.slot) {
      this.selected = this.data.slot
    }
    
  }
  
  static get defaultOptions() {
    const cols = game.settings.get("moulinette-sounds", "soundboardCols")
    return mergeObject(super.defaultOptions, {
      id: "moulinette-favorite",
      classes: ["mtte", "favorite"],
      title: game.i18n.localize("mtte.favorite"),
      template: "modules/moulinette-sounds/templates/favorite.hbs",
      width: MoulinetteFavorite.WIDTH[cols],
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  getData() {
    let slots = []
    // if slot is specified => edit mode
    if(!this.data.slot) {
      let favorites = game.settings.get("moulinette", "soundboard")
      const cols = game.settings.get("moulinette-sounds", "soundboardCols")
      const rows = game.settings.get("moulinette-sounds", "soundboardRows")
      for(let r=0; r<rows; r++) {
        let list = []
        for(let c=0; c<cols; c++) {
          const i = 1 + (r*cols) + c
          let data = { num: i, name: i }
          if(Object.keys(favorites).includes("fav" + i)) {
            const fav = favorites["fav" + i]
            data["name"] = ""
            if(fav.faIcon) {
              data["faIcon"] = fav.icon.startsWith("fa") ? fav.icon : "fas fa-" + fav.icon
            } else if(fav.icon) {
              data["icon"] = fav.icon
            } else {
              data["name"] = fav.name
            }
          }
          list.push(data)
        }
        slots.push(list)
      }
    }
    return {slots: slots, data: this.data, multiple: Array.isArray(this.data.path), volume: AudioHelper.volumeToInput(this.data.volume)}
  }
  
  async _onClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    if(button.classList.contains("cancel")) {
      this.close()
    }
    else if(button.classList.contains("slot")) {
      const idx = button.dataset.idx
      this.html.find("button").removeClass("selected")
      $(button).addClass("selected")
      this.selected = idx;
    }
    else if(button.classList.contains("browse")) {
      const icon = this.html.find("input.icon2").val()
      new FilePicker({callback: this._onPathChosen.bind(this), current: icon ? icon : "moulinette/images/", type: "image"}).render(true);
    }
    else if(button.classList.contains("delete")) {
      // prompt confirmation
      let favorites = game.settings.get("moulinette", "soundboard")
      const dialogDecision = await Dialog.confirm({
        title: game.i18n.localize("mtte.deleteFavorite"),
        content: game.i18n.format("mtte.deleteFavoriteContent", { from: favorites["fav" + this.selected].name }),
      })
      if(!dialogDecision) return;

      delete favorites["fav" + this.selected]
      await game.settings.set("moulinette", "soundboard", favorites)
      this.close()
      if(this.parent) {
        this.parent.render()
      }
    }
    else if(button.classList.contains("save")) {
      const text = this.html.find("input.shortText").val()
      const icon = this.html.find("input.icon").val()
      const icon2 = this.html.find("input.icon2").val()
      if(!this.selected) {
        return ui.notifications.error(game.i18n.localize("mtte.errorChooseSlot"));
      }
      if(text.length == 0) {
        return ui.notifications.error(game.i18n.localize("mtte.errorEnterShortText"));
      }
      if(icon.length > 0 && icon2.length > 0) {
        return ui.notifications.error(game.i18n.localize("mtte.errorDoubleIconDefined"));
      }
      let favorites = game.settings.get("moulinette", "soundboard")
      favorites["fav" + this.selected] = { name: text, icon: (icon.length > 0 ? icon : icon2), faIcon: icon.length > 0, path: this.data.path, volume: this.data.volume }
      await game.settings.set("moulinette", "soundboard", favorites)
      this.close()
      if(this.parent) {
        this.parent.render()
      }
    }
  }
  
  _onPathChosen(path) {
    this.html.find("input.icon2").val(path)
  }
  
  async _onTogglePreview(event) {
    let sound = null
    if( Array.isArray(this.data.path) ) {
      // pause sound if playing
      if(this.currentlyPlaying && !this.currentlyPlaying.paused) {
        this.currentlyPlaying.pause()
        this.currentlyPlaying.currentTime = 0;
        this.currentlyPlaying = null
        return
      }
      const rand = Math.floor((Math.random() * this.data.path.length));
      sound = document.getElementById("previewSound" + rand)
      this.currentlyPlaying = sound
    } else {
      sound = document.getElementById("previewSound")
    }
    
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

  activateListeners(html) {
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
    IconPicker.Run('#GetIconPickerEdit');

    html.find("button").click(this._onClick.bind(this))
    html.find("h2 a.sound-control i").click(this._onTogglePreview.bind(this))
    html.find('.sound-volume').change(event => this._onSoundVolume(event));
    html.find("audio").prop("volume", AudioHelper.volumeToInput(this.data.volume))
  }
  
}
