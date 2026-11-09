// Correspondências explícitas fornecidas pela usuária. Sem numeração paralela.
export const officialArtFiles = {
  'a-maldicao-de-kayako-saeki': 'kayako.jpg',
  'kisaragi-station': 'kisaragi.jpg',
  'meng-jiangnu': 'meng-jiangnu.jpg',
  kuldhara: 'kuldhara.jpg',
  'tamamo-no-mae': 'tamamo.jpg',
  'loira-do-banheiro': 'loira.jpg',
  kiyohime: 'kiyohime.jpg',
  hachishakusama: 'hachishakusama.jpg',
}
export const exhibitCards = [{ id: 'saci-perere', nome: 'Saci Pererê',
  imagem: '/casa/img/cartas/saci.jpg', extra: true,
  subtitulo: 'O menino de uma perna só', origem: 'Brasil · Folclore',
  historia: 'Gorro vermelho, cachimbo e uma perna só. Esconde objetos, embaraça a crina dos cavalos e some dentro dos redemoinhos. Quem jogar uma peneira no redemoinho e tirar seu gorro faz dele seu servo.' }]
export const canonicalCardId = id => id === 'kayako-saeki' ? 'a-maldicao-de-kayako-saeki' : id
export const cardBack = id => ['kuldhara', 'meng-jiangnu', 'kisaragi-station', 'loira-do-banheiro'].includes(id) ? 'vitral' : 'boitata'
