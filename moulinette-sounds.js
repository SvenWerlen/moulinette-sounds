import { MoulinetteSoundPads } from "./modules/moulinette-soundpads.js"
import { MoulinetteSoundsUtil } from "./modules/moulinette-sounds-util.js"

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
    default: false,
    type: Boolean
  });
  game.settings.register("moulinette-sounds", "soundpadHideTTAWarning", {
    name: game.i18n.localize("mtte.configSoundpadHideTTAWarning"),
    hint: game.i18n.localize("mtte.configSoundpadHideTTAWarningHint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register("moulinette-sounds", "soundpadDownloadSounds", {
    name: game.i18n.localize("mtte.configSoundpadDownloadSounds"),
    hint: game.i18n.localize("mtte.configSoundpadDownloadSoundsHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  game.settings.register("moulinette", "soundpadVolume", { scope: "world", config: false, default: 1, type: Number });
  game.settings.register("moulinette", "soundpadHidden", { scope: "world", config: false, type: Object, default: {} })

  game.keybindings.register("moulinette-core", "soundpadsKey", {
    name: game.i18n.localize("mtte.configSoundPadKey"),
    hint: game.i18n.localize("mtte.configSoundPadHint"),
    editable: [{ key: "KeyS", modifiers: [ "Alt" ]}],
    onDown: () => {
      if(game.moulinette.applications.MoulinetteSoundPads) {
        (new game.moulinette.applications.MoulinetteSoundPads()).render(true)
      } else {
        console.warn("Moulinette Sounds not enabled (or not up-to-date?)")
      }
    },
    onUp: () => {},
    restricted: true,  // Restrict this Keybinding to gamemaster only?
    reservedModifiers: [],
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  })
});


/**
 * Ready: define new moulinette forge module
 */
Hooks.once("ready", async function () {
  if (game.user.isGM) {
    // create default home folder for sounds
    await game.moulinette.applications.MoulinetteFileUtil.createFolderRecursive("moulinette/sounds/custom");
    
    game.moulinette.applications["MoulinetteSoundPads"] = MoulinetteSoundPads
    game.moulinette.applications["MoulinetteSoundBoard"] = (await import("./modules/moulinette-soundboard.js")).MoulinetteSoundBoard

    const moduleClass = (await import("./modules/moulinette-sounds.js")).MoulinetteSounds
    game.moulinette.forge.push({
      id: "sounds",
      layer: "sounds",
      icon: "fas fa-music",
      name: game.i18n.localize("mtte.sounds"),
      description: game.i18n.localize("mtte.soundsDescription"),
      instance: new moduleClass(),
      actions: [
        //{id: "playChecked", icon: "fas fa-check-square" ,name: game.i18n.localize("mtte.playChecked"), help: game.i18n.localize("mtte.playCheckedToolTip") },
        {id: "configureSources", icon: "fas fa-cogs" ,name: game.i18n.localize("mtte.configureSources"), help: game.i18n.localize("mtte.configureSourcesToolTip") },
        {id: "favoriteChecked", icon: "fas fa-bookmark" ,name: game.i18n.localize("mtte.favoriteChecked"), help: game.i18n.localize("mtte.favoriteCheckedToolTip") },
        //{id: "customReferences", icon: "fas fa-plus-square" ,name: game.i18n.localize("mtte.customReferences"), help: game.i18n.localize("mtte.customReferencesToolTip") },
        {id: "howto", icon: "fas fa-question-circle" ,name: game.i18n.localize("mtte.howto"), help: game.i18n.localize("mtte.howtoToolTip") }
      ],
      actionsExt: [
        //{id: "showSoundPads", icon: "fas fa-music" ,name: game.i18n.localize("mtte.showSoundPads"), help: game.i18n.localize("mtte.showSoundPadsToolTip") },
        //{id: "activatePlaylist", icon: "fas fa-music" ,name: game.i18n.localize("mtte.activatePlaylistTab"), help: game.i18n.localize("mtte.activatePlaylistTabToolTip") },
        //{id: "deletePlaylist", icon: "fas fa-trash" ,name: game.i18n.localize("mtte.deletePlaylist"), help: game.i18n.localize("mtte.deletePlaylistToolTip") },
        //{id: "howto", icon: "fas fa-question-circle" ,name: game.i18n.localize("mtte.howto"), help: game.i18n.localize("mtte.howtoToolTip") }
      ],
      shortcuts: [{
        id: "soundpads",
        name: game.i18n.localize("mtte.soundpads"),
        icon: "fas fa-file-audio"
      },{
        id: "soundboard",
        name: game.i18n.localize("mtte.soundboard"),
        icon: "fas fa-keyboard"
      }]
    })

    console.log("Moulinette Sounds | Module loaded")
  }
});


/**
 * Update playing status
 */
Hooks.on("preUpdatePlaylist", (playlist, updateData) => {
  if (game.user.isGM && updateData.sounds) {
    const soundStatus = []
    for(const s of updateData.sounds) {
      const sound = playlist.sounds.find(snd => snd.id == s._id)
      let soundIdx = -1
      // find matching sound
      const filename = decodeURIComponent(sound.path.split("/").pop())
      $(`.list .sound`).each(function( idx, snd ) {
        const fn = $(snd).attr("data-filename")
        if(fn && fn.endsWith(filename)) {
          soundIdx = $(snd).attr("data-idx")
        }
      })
      $(`.list .sound[data-idx='${soundIdx}'] a[data-action='sound-play'] i`).attr("class", s.playing ? "fas fa-square" : "fas fa-play")
    }
  }
});


/**
 * Update sound properties
 */
Hooks.on("preUpdatePlaylistSound", (playlistSound, updateData) => {
  if (game.user.isGM) {
    let sound = -1
    // find matching sound
    const filename = decodeURIComponent(playlistSound.path.split("/").pop())
    $(`.list .sound`).each(function( idx, snd ) {
      const fn = $(snd).attr("data-filename")
      if(fn && fn.endsWith(filename)) {
        sound = $(snd).attr("data-idx")
      }
    })
    if(Object.keys(updateData).includes("volume")) {
      $(`.list .sound[data-idx='${sound}'] .sound-volume input`).val(AudioHelper.volumeToInput(updateData.volume))
    } else if(Object.keys(updateData).includes("repeat")) {
      $(`.list .sound[data-idx='${sound}'] a[data-action='sound-repeat']`).attr("class", updateData.repeat ? "sound-control" : "sound-control inactive")
    } else if(Object.keys(updateData).includes("playing")) {
      $(`.list .sound[data-idx='${sound}'] a[data-action='sound-play'] i`).attr("class", updateData.playing ? "fas fa-square" : "fas fa-play")
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
    await MoulinetteSoundsUtil.downloadAsset(selSound)
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
          await MoulinetteSoundsUtil.downloadAsset(data)
          sound.name = game.moulinette.applications.Moulinette.prettyText(sound.filename.replace("/","").replace(".ogg","").replace(".mp3","").replace(".wav","").replace(".webm","").replace(".m4a",""))
          sound.volume = AudioHelper.inputToVolume(data.volume)
          sound.repeat = data.repeat
          sound.path = data.path
          const playlist = game.playlists.get($(pl).data("document-id"))
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

/**
 * Support for Blitz SoundBoards
 * WIP
 */
/**
Hooks.once('SBPackageManagerReady', () => {
  SoundBoard.packageManager.addSoundPack(game.i18n.localize("SBFREEPACK.title"), 'modules/SoundBoard-BlitzFreePack/bundledAudio/', 'SoundBoard-BlitzFreePack', {
      licenses: [{
          licenseType: 'SoundSnap License',
          licenseUrl: 'https://www.soundsnap.com/licence',
          licenseDescription: 'Naval Warfare category, donated by powerkor'
      },
      {
          licenseType: 'CC0',
          licenseUrl: 'https://raw.githubusercontent.com/BlitzKraig/fvtt-SoundBoard-BlitzFreePack/master/bundledAudio/Cult%20Chant/LICENSE',
          licenseDescription: 'Cult Chant category - Created by Blitz'
      },
      {
          licenseType: 'Sonniss GDC/Royalty Free',
          licenseUrl: 'https://sonniss.com/gameaudiogdc',
          licenseDescription: 'Everything else'
      }],
      author: 'Blitz#6797',
      link: 'https://www.github.com/BlitzKraig/fvtt-SoundBoard-BlitzFreePack',
      description: game.i18n.localize("SBFREEPACK.desc")
  });
});
 */