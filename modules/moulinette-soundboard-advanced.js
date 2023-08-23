/*************************
 * Moulinette SoundBoard (v3)
 *************************/
import { MoulinetteSounds } from "./moulinette-sounds.js"
import { MoulinetteSoundBoardSound } from "./moulinette-soundboard-sound.js"

export class MoulinetteSoundBoardAdvanced extends FormApplication {

  static CELL_SIZE = 36 + 2 + 10 // border(1) & margin(5)
  static MAX_ROWS = 30
  static MAX_COLS = 30

  constructor(data) {
    super()

    const settings = game.settings.get("moulinette", "soundboard-advanced")
    this.cols = "cols" in settings ? settings["cols"] : 10
    this.rows = "rows" in settings ? settings["rows"] : 1
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-soundboard",
      classes: ["mtte", "soundboard"],
      title: `${game.user.name}'s ${game.i18n.localize("mtte.soundboard")}`,
      template: "modules/moulinette-sounds/templates/soundboard-advanced.hbs",
      width: 100,
      height: "auto",
      minimizable: true,
      closeOnSubmit: false,
      submitOnClose: false
    });
  }
  
  getData() {
    const settings = game.settings.get("moulinette", "soundboard-advanced")
    const sounds = []
    for(let r=0; r<this.rows; r++) {
      const row = []
      for(let c=0; c<this.cols; c++) {
        const i = 1 + (r*this.cols) + c
        if(Object.keys(settings).includes(`audio-${r}#${c}`)) {
          const audio = duplicate(settings[`audio-${r}#${c}`])
          audio.id = `${r}#${c}`
          audio.idx = i
          row.push(audio)

          // button size is larger
          if(audio.size && audio.size > 1) {
            c += audio.size-1
          }
        } else {
          row.push({ id: `${r}#${c}`, idx: i })
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

    // resize windows to fit columns (16 is the padding (8))
    this.setPosition({"width": MoulinetteSoundBoardAdvanced.CELL_SIZE * this.cols + 16})

    // retrieve settings
    const settings = game.settings.get("moulinette", "soundboard-advanced")

    html.find(".addRow").click(ev => {
      this.rows = Math.min(this.rows+1, MoulinetteSoundBoardAdvanced.MAX_ROWS)
      settings.rows = this.rows
      game.settings.set("moulinette", "soundboard-advanced", settings).then(() => parent.render(true))
    })
    html.find(".remRow").click(ev => {
      this.rows = Math.max(this.rows-1, 1)
      settings.rows = this.rows
      game.settings.set("moulinette", "soundboard-advanced", settings).then(() => parent.render(true))
    })
    html.find(".addCol").click(ev => {
      this.cols = Math.min(this.cols+1, MoulinetteSoundBoardAdvanced.MAX_COLS)
      settings.cols = this.cols
      game.settings.set("moulinette", "soundboard-advanced", settings).then(() => parent.render(true))
    })
    html.find(".remCol").click(ev => {
      this.cols = Math.max(this.cols-1, 1)
      settings.cols = this.cols
      game.settings.set("moulinette", "soundboard-advanced", settings).then(() => parent.render(true))
    })

    html.find(".export").click(ev => {
      const filename = `moulinette-${game.world.title.slugify()}-soundboard.json`
      const data = game.settings.get("moulinette", "soundboard-advanced")
      saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);
    })

    html.find(".import").click(async function(ev) {
      new Dialog({
        title: `Import Data: Moulinette Soundboard`,
        content: await renderTemplate("templates/apps/import-data.html", {
          hint1: game.i18n.format("DOCUMENT.ImportDataHint1", {document: "soundboard"}),
          hint2: game.i18n.format("DOCUMENT.ImportDataHint2", {name: "this soundboard"})
        }),
        buttons: {
          import: {
            icon: '<i class="fas fa-file-import"></i>',
            label: "Import",
            callback: html => {
              const form = html.find("form")[0];
              if ( !form.data.files.length ) return ui.notifications.error("You did not upload a data file!");
              readTextFromFile(form.data.files[0]).then(json => {
                game.settings.set("moulinette", "soundboard-advanced", JSON.parse(json)).then(ev => parent.render(true))
              });
            }
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          }
        },
        default: "import"
      }, {
        width: 400
      }).render(true);
    })

    html.find(".delete").click(ev => {
      return Dialog.confirm({
        title: `${game.i18n.localize("mtte.soundboardDeleteTooltip")}`,
        content: `${game.i18n.localize("mtte.soundboardDeleteWarning")}`,
        yes: html => {
          game.settings.set("moulinette", "soundboard-advanced", {}).then(ev => parent.render(true))
        }
      });
    })


    html.find('.snd.used').click(ev => this._playSound(ev, html))
    html.find('.snd.unused').click(ev => this._editSound(ev, html, true))
    html.find('.snd').mousedown(ev => this._editSound(ev, html))

    html.find('.snd.used').on('dragstart',function (event) {
      const slot = event.currentTarget.dataset.slot
      event.originalEvent.dataTransfer.setData("text/plain", slot)
    })

    html.find('.snd').on('drop', async function (event) {
      event.preventDefault();

      const fromSlot = event.originalEvent.dataTransfer.getData("text/plain");
      const toSlot = event.currentTarget.dataset.slot

      let settings = game.settings.get("moulinette", "soundboard-advanced")
      if(fromSlot && toSlot && fromSlot != toSlot && Object.keys(settings).includes("audio-" + fromSlot)) {
        const fromAudio = settings["audio-" + fromSlot]
        const toAudio = Object.keys(settings).includes("audio-" + toSlot) ? settings["audio-" + toSlot] : null
        let overwrite = null
        // target not defined => move
        if(!toAudio) {
          overwrite = true
        }
        // target defined => prompt for desired behaviour
        else {
          overwrite = await Dialog.confirm({
            title: game.i18n.localize("mtte.moveSoundboardAudio"),
            content: game.i18n.localize("mtte.moveSoundboardAudioContent"),
          })
          if(overwrite == null) return;
        }
        settings["audio-" + toSlot] = fromAudio
        if(overwrite) {
          delete settings["audio-" + fromSlot]
        } else {
          settings["audio-" + fromSlot] = toAudio
        }

        await game.settings.set("moulinette", "soundboard-advanced", settings)
        parent.render()
      }
    })

    html.find('.snd').on('dragover',function (event) {
      event.preventDefault();
    })

    this.bringToTop()
  }

  async _editSound(event, html, force = false) {
    // right click only
    if(force || event.which == 3) {
      const slot = event.currentTarget.dataset.slot;
      
      let settings = game.settings.get("moulinette", "soundboard-advanced")
      
      const row = Number(slot.split('#')[0])
      const col = Number(slot.split('#')[1])

      let data = {}
      if(Object.keys(settings).includes("audio-" + slot)) {
        data = settings["audio-" + slot]
      } else {
        data.path = []
      }
      data.idx = row * this.cols + col + 1
      const moulinette = new MoulinetteSoundBoardSound(data, slot, this);
      moulinette.options.title = game.i18n.localize("mtte.favoriteEdit")
      moulinette.render(true)
    }
  }

  async _playSound(event, html) {
    const slot = event.currentTarget.dataset.slot
    if(slot) {
      let settings = game.settings.get("moulinette", "soundboard-advanced")
      if(Object.keys(settings).includes("audio-" + slot)) {
        if (game.user.isGM) {
          MoulinetteSounds.playSoundAsGM(game.user.name, settings["audio-" + slot])
        }
        else {
          game.socket.emit("module.moulinette-sounds", {
            user: game.user.name,
            audio: settings["audio-" + slot]
          });
        }
      } else {
        ui.notifications.warn(game.i18n.localize("mtte.slotNotAssigned"));
      }
    }
  }

}
