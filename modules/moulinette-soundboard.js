/*************************
 * Moulinette SoundBoard (v2)
 *************************/
import { MoulinetteSounds } from "./moulinette-sounds.js"
import { MoulinetteFavorite } from "./moulinette-favorite.js"

export class MoulinetteSoundBoard extends FormApplication {

  constructor(data) {
    super()
  }
  
  static get defaultOptions() {
    const cols = game.settings.get("moulinette-sounds", "soundboardCols")
    return mergeObject(super.defaultOptions, {
      id: "moulinette-soundboard",
      classes: ["mtte", "soundboard"],
      title: game.i18n.localize("mtte.soundboard"),
      template: "modules/moulinette-sounds/templates/soundboard.hbs",
      width: 50*cols,
      height: "auto",
      resizable: true,
      minimizable: false,
      closeOnSubmit: false,
      submitOnClose: false
    });
  }
  
  async getData() {
    let html = ""
    let favorites = game.settings.get("moulinette", "soundboard")
    const cols = game.settings.get("moulinette-sounds", "soundboardCols")
    const rows = game.settings.get("moulinette-sounds", "soundboardRows")

    const sounds = []

    for(let r=0; r<rows; r++) {
      const row = []
      for(let c=0; c<cols; c++) {
        const i = 1 + (r*cols) + c
        if(Object.keys(favorites).includes("fav" + i)) {
          const fav = duplicate(favorites["fav" + i])
          fav.idx = i
          fav.icon = fav.faIcon && !fav.icon.startsWith("fa") ? "fas fa-" + fav.icon : fav.icon
          row.push(fav)
        } else {
          row.push({ idx: i })
        }
      }
      sounds.push(row)
    }

    return { sounds: sounds }
  }

  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html

    // reference to this instance
    const parent = this

    // two actions (help/refresh)
    html.find("a.help").click(ev => parent.html.find(".helpMsg").toggle())
    html.find("a.refresh").click(ev => parent.render())
    html.find("a.sounds").click(ev => {
      const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
      new forgeClass("sounds").render(true)
    })

    html.find(".gotoSounds").click(ev => {
      const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
      new forgeClass("sounds").render(true)
    })

    html.find('.snd.used').click(ev => this._playFavorite(ev, html))
    html.find('.snd.used').mousedown(ev => this._editFavorite(ev, html))

    html.find('.snd.used').on('dragstart',function (event) {
      const slot = event.currentTarget.dataset.slot
      event.originalEvent.dataTransfer.setData("text/plain", slot)
    })

    html.find('.snd').on('drop', async function (event) {
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
        parent.render()
      }
    })

    html.find('.snd').on('dragover',function (event) {
      event.preventDefault();
    })

    this.bringToTop()
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
          data["icon"] = fav.icon.startsWith("fa") ? fav.icon : "fas fa-" + fav.icon
        } else if(fav.icon.length > 0) {
          data["icon2"] = fav.icon
        }
        const moulinette = new MoulinetteFavorite(data, this);
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
          sound = (await playlist.createEmbeddedDocuments("PlaylistSound", [{name: name, path: path, volume: Number(fav.volume)}], {}))[0]
        }
        playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, playing: !sound.data.playing, volume: Number(fav.volume) }]);
      } else {
        ui.notifications.warn(game.i18n.localize("mtte.slotNotAssigned"));
        const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
        new forgeClass("sounds").render(true)
        event.stopPropagation();
      }
    }
  }


}
