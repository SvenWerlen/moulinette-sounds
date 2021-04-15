/*************************
 * Moulinette Favorite
 *************************/
export class MoulinetteFavorite extends FormApplication {
  
  static WIDTH = {10: 420, 15: 630, 20: 840}
  
  constructor(data) {
    super()
    this.data = data
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
              data["faIcon"] = fav.icon
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
    return {slots: slots, data: this.data, multiple: Array.isArray(this.data.path)}
  }
  
  async _onClick(event) {
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
    else if(button.classList.contains("save")) {
      const text = this.html.find("input.shortText").val()
      const icon = this.html.find("input.icon").val()
      const icon2 = this.html.find("input.icon2").val()
      if(!this.selected) {
        return ui.notifications.error(game.i18n.localize("ERROR.mtteChooseSlot"));
      }
      if(text.length == 0) {
        return ui.notifications.error(game.i18n.localize("ERROR.mtteEnterShortText"));
      }
      if(icon.length > 0 && icon2.length > 0) {
        return ui.notifications.error(game.i18n.localize("ERROR.mtteDoubleIconDefined"));
      }
      let favorites = game.settings.get("moulinette", "soundboard")
      favorites["fav" + this.selected] = { name: text, icon: (icon.length > 0 ? icon : icon2), faIcon: icon.length > 0, path: this.data.path, volume: this.data.volume }
      await game.settings.set("moulinette", "soundboard", favorites)
      //Moulinette._createOptionsTable($('#controls'))
      this.close()
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

  activateListeners(html) {
    this.html = html
    //super.activateListeners(html);
    //if (!$('.moulinette-scene-control').hasClass('active')) {
    //  $('.moulinette-scene-control').click();
    //} 
    html.find("button").click(this._onClick.bind(this))
    html.find("h2 a.sound-control i").click(this._onTogglePreview.bind(this))
  }
  
}
