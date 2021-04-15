/**
 * Client functions for communicating with BBC Sound Effects API
 */
export class MoulinetteBBCClient {
  
  static API = "https://r9fanuyewg.execute-api.eu-west-1.amazonaws.com/prod/api/sfx/search"
  static HEADERS = { 'Accept': 'application/json', 'Content-Type': 'application/json; charset=utf-8' }
  
  token = null
  
  /*
   * Sends a etch to server and return the response
   */
  async search(query) {
    
    const content = {"criteria": { "from":0, "size":30, "query": query } }
    const response = await fetch(MoulinetteBBCClient.API, { method:'POST', headers: MoulinetteBBCClient.HEADERS, body: JSON.stringify(content)}).catch(function(e) {
      console.log(`Moulinette | Cannot establish connection to server ${MoulinetteBBCClient.API}`, e)
    });
    return { 'status': response.status, 'data': await response.json() }
  }
}
