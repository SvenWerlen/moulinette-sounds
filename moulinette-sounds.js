import { MoulinetteSoundPads } from "./modules/moulinette-soundpads.js"

Hooks.once("init", async function () {
  console.log("Moulinette Sounds | Init")
  game.settings.register("moulinette", "soundboard", { scope: "world", config: false, type: Object, default: {} })
  game.settings.register("moulinette-sounds", "soundboardCols", {
    name: game.i18n.localize("mtte.configSoundboardColumns"), 
    hint: game.i18n.localize("mtte.configSoundboardColumnsHint"), 
    scope: "world",
    config: true,
    default: 10,
    type: Number,
    choices: { 10: "10", 15: "15", 20: "20" }
  });
  game.settings.register("moulinette-sounds", "soundboardRows", {
    name: game.i18n.localize("mtte.configSoundboardRows"), 
    hint: game.i18n.localize("mtte.configSoundboardRowsHint"), 
    scope: "world",
    config: true,
    default: 1,
    type: Number,
    choices: { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5" }
  });
  game.settings.register("moulinette-sounds", "defaultEffectRadius", {
    name: game.i18n.localize("mtte.configDefaultEffectRadius"), 
    hint: game.i18n.localize("mtte.configDefaultEffectRadiusHint"), 
    scope: "world",
    config: true,
    default: 10,
    type: Number
  });
  game.settings.register("moulinette-sounds", "defaultRepeatOn", {
    name: game.i18n.localize("mtte.configDefaultRepeatOn"), 
    hint: game.i18n.localize("mtte.configDefaultRepeatOnHint"), 
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register("moulinette-sounds", "soundboardHideUI", {
    name: game.i18n.localize("mtte.configSoundboardHideUI"),
    hint: game.i18n.localize("mtte.configSoundboardHideUIHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  game.settings.register("moulinette", "soundboardPin", { scope: "world", config: false, type: Boolean, default: false })
  game.settings.register("moulinette", "soundpadVolume", { scope: "world", config: false, default: 1, type: Number });
});


/**
 * Ready: define new moulinette forge module
 */
Hooks.once("ready", async function () {
  if (game.user.isGM) {
    // create default home folder for sounds
    await game.moulinette.applications.MoulinetteFileUtil.createFolderRecursive("moulinette/sounds/custom");
    
    game.moulinette.applications["MoulinetteSoundPads"] = MoulinetteSoundPads
    const moduleClass = (await import("./modules/moulinette-sounds.js")).MoulinetteSounds
    game.moulinette.forge.push({
      id: "sounds",
      icon: "fas fa-music",
      name: game.i18n.localize("mtte.sounds"),
      description: game.i18n.localize("mtte.soundsDescription"),
      instance: new moduleClass(),
      actions: [
        {id: "indexSounds", icon: "fas fa-sync" ,name: game.i18n.localize("mtte.indexSounds"), help: game.i18n.localize("mtte.indexSoundsToolTip") },
        {id: "playChecked", icon: "fas fa-check-square" ,name: game.i18n.localize("mtte.playChecked"), help: game.i18n.localize("mtte.playCheckedToolTip") },
        {id: "favoriteChecked", icon: "fas fa-bookmark" ,name: game.i18n.localize("mtte.favoriteChecked"), help: game.i18n.localize("mtte.favoriteCheckedToolTip") },
        {id: "customReferences", icon: "fas fa-plus-square" ,name: game.i18n.localize("mtte.customReferences"), help: game.i18n.localize("mtte.customReferencesToolTip") }
      ],
      actionsExt: [
        {id: "showSoundPads", icon: "fas fa-music" ,name: game.i18n.localize("mtte.showSoundPads"), help: game.i18n.localize("mtte.showSoundPadsToolTip") },
        {id: "activatePlaylist", icon: "fas fa-music" ,name: game.i18n.localize("mtte.activatePlaylistTab"), help: game.i18n.localize("mtte.activatePlaylistTabToolTip") },
        {id: "deletePlaylist", icon: "fas fa-trash" ,name: game.i18n.localize("mtte.deletePlaylist"), help: game.i18n.localize("mtte.deletePlaylistToolTip") },
        {id: "howto", icon: "fas fa-question-circle" ,name: game.i18n.localize("mtte.howto"), help: game.i18n.localize("mtte.howtoSoundsToolTip") }
      ],
      shortcuts: [{
        id: "pin", 
        name: game.i18n.localize("mtte.pinSoundBoard"),
        icon: "fas fa-thumbtack"
      }]
    })
    
    // Binding with a default key and a simple callback
    if(typeof KeybindLib != "undefined") {
      KeybindLib.register("moulinette-core", "soundpadsKey", {
        name: game.i18n.localize("mtte.configSoundPadKey"),
        hint: game.i18n.localize("mtte.configSoundPadHint"),
        default: "Alt + KeyS",
        onKeyDown: () => {
          if(game.moulinette.applications.MoulinetteSoundPads) {
            (new game.moulinette.applications.MoulinetteSoundPads()).render(true)
          } else {
            console.warn("Moulinette Sounds not enabled (or not up-to-date?)")
          }
        }
      });
    }

    console.log("Moulinette Sounds | Module loaded")
  }
});


/**
 * Change Sound play status
 * 
 * !! Signature changed from (parent, data, update) to (parent, update) in 0.8
 */
Hooks.on("preUpdatePlaylistSound", (parent, dataOrUpdate) => {
  if (game.user.isGM) {
    const update = dataOrUpdate
    const data = parent.data
    let sound = -1
    // find matching sound
    const filename = data.path.split("/").pop()
    $(`.list .sound`).each(function( idx, snd ) { 
      const fn = $(snd).attr("data-filename")
      if(fn && fn.endsWith(filename)) { 
        sound = $(snd).attr("data-idx") 
      }
    })
    if(Object.keys(update).includes("playing")) {
      $(`.list .sound[data-idx='${sound}'] a[data-action='sound-play'] i`).attr("class", update.playing ? "fas fa-square" : "fas fa-play")
    } else if(Object.keys(update).includes("volume")) {
      $(`.list .sound[data-idx='${sound}'] input.sound-volume`).val(AudioHelper.volumeToInput(update.volume))
    } else if(Object.keys(update).includes("repeat")) {
      $(`.list .sound[data-idx='${sound}'] a[data-action='sound-repeat']`).attr("class", update.repeat ? "sound-control" : "sound-control inactive")
    }
  }
});


/**
 * Manage canvas drop
 */
Hooks.on('dropCanvasData', (canvas, data) => { 
  if(data.source == "mtte") {
    if(data.type == "Sound") {
      import("./modules/moulinette-sounds.js").then( c => {
        c.MoulinetteSounds.createSound(data)
      })
      return false;
    }
  }
});


/**
 * Manage canvas drop
 */
Hooks.on('renderAmbientSoundConfig', async function(cl, html, sound) { 
  const selSound = game.moulinette.cache.getData("selSound")
  if( !sound.data.path && selSound ) { 
    const clSound = await import("./modules/moulinette-sounds.js")
    await clSound.MoulinetteSounds.downloadAsset(selSound)
    html.find("input[name='path']").val(selSound.path)
  }
});


// Initiate Drop functionality
Hooks.on("renderPlaylistDirectory", (app, html) => {

  const playlists = html.find(".directory-list .playlist");
  playlists.each((index, pl) => {
    pl.ondrop = async function(event) {
      try {
        const source = event.currentTarget;
        const data = JSON.parse(event.dataTransfer.getData('text/plain'));
        if(data && data.source == "mtte" && data.sound && data.pack) {
          const sound = data.sound
          const clSound = await import("./modules/moulinette-sounds.js")
          await clSound.MoulinetteSounds.downloadAsset(data)
          sound.name = game.moulinette.applications.Moulinette.prettyText(sound.filename.replace("/","").replace(".ogg","").replace(".mp3","").replace(".wav","").replace(".webm","").replace(".m4a",""))
          sound.volume = AudioHelper.inputToVolume(data.volume)
          sound.repeat = data.repeat
          sound.path = data.path
          const playlist = game.playlists.get($(pl).data("entity-id"))
          if(playlist) {
            (await playlist.createEmbeddedDocuments("PlaylistSound", [sound], {}))[0]
          } else {
            console.warn("Moulinette Sounds | Couldn't find playlist")
          }
        }
      } catch(e) {
        console.warn("Moulinette Sounds | Not able to create sound in selected playlist", e)
      }
    }
  });
});
