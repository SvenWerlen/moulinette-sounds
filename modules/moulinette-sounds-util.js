/**
 * Moulinette Sounds Utilities
 */
export class MoulinetteSoundsUtil {

  /**
   * Download an asset
   * - data.path will be set with local path
   */
  static async downloadAsset(data) {
    const FileUtil = game.moulinette.applications.MoulinetteFileUtil
    const baseURL = await FileUtil.getBaseURL()
    if(!data.pack.isRemote || data.pack.special) {
      data.path = data.sound.assetURL
    }
    else {
      await FileUtil.downloadAssetDependencies(data.sound, data.pack, "sounds")
      data.path = baseURL + FileUtil.getMoulinetteBasePath("sounds", data.pack.publisher, data.pack.name) + FileUtil.encodeURL(data.sound.filename)
    }

    // Clear useless info
    delete data.pack
    delete data.sound
  }

  /**
   * Changing this implementation is against Terms of Use / License
   * https://tabletopaudio.com/about.html
   */
  static noTTADownload() {
    // 5$, 10$, 20$, 50$ can download sounds
    const TTA = ["362213", "362214", "362215", "362216"]
    const three = game.moulinette.user.pledges ? game.moulinette.user.pledges.find(p => p.id == "362212") : null
    const fiveOrMore = game.moulinette.user.pledges ? game.moulinette.user.pledges.find(p => TTA.includes(p.id)) : null
    // 3$ but not 5$+? => filter assets out
    return three && !fiveOrMore
  }

}
