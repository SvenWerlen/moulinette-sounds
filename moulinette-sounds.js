
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
  game.settings.register("moulinette", "soundboardPin", { scope: "world", config: false, type: Boolean, default: false })
});


/**
 * Ready: define new moulinette forge module
 */
Hooks.once("ready", async function () {
  if (game.user.isGM) {
    // create default home folder for game icons
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing(".", "moulinette");
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing("moulinette", "moulinette/sounds");
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing("moulinette/sounds", "moulinette/sounds/custom");
    
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
    
    console.log("Moulinette Sounds | Module loaded")
  }
});


// Change Sound play status
Hooks.on("preUpdatePlaylistSound", (parent, data, update) => {
  if (game.user.isGM) {
    if(Object.keys(update).includes("playing")) {
      $(`.list .sound[data-path='${data.path}'] a[data-action='sound-play'] i`).attr("class", update.playing ? "fas fa-square" : "fas fa-play")
    } else if(Object.keys(update).includes("volume")) {
      $(`.list .sound[data-path='${data.path}'] input.sound-volume`).val(AudioHelper.volumeToInput(update.volume))
    } else if(Object.keys(update).includes("repeat")) {
      $(`.list .sound[data-path='${data.path}'] a[data-action='sound-repeat']`).attr("class", update.repeat ? "sound-control" : "sound-control inactive")
    }
  }
});
