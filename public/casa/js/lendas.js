/* =========================================================
   LENDAS — dados do corredor
   Para adicionar uma lenda: copie um bloco e ajuste.
   "gravura" é o desenho SVG (viewBox 0 0 200 250) do quadro.
   Se o seu backend já tem a coleção, troque este array pela
   resposta da API (mesmos campos).
   ========================================================= */
window.Bau = window.Bau || {};

Bau.TOTAL_REGISTROS = 60;

Bau.lendas = [
  {
    id: 'loira-do-banheiro', num: '01', nome: 'Loira do Banheiro', original: '',
    local: 'GUARATINGUETÁ, BRASIL', ala: 'ALA BRASIL',
    periodo: 'SÉC. XIX', tipo: 'LENDA ESCOLAR', intensidade: 3,
    frase: 'Chame três vezes diante do espelho. Ela responde.',
    relato: [
      'A versão mais contada liga a lenda a Maria Augusta de Oliveira Borges, moça de Guaratinguetá que morreu jovem no fim do século XIX. O corpo teria ficado guardado na casa da família por muito tempo antes do enterro.',
      'Anos depois, o casarão virou escola. Os alunos começaram a dizer que uma mulher loira, pálida, com algodão no nariz, aparecia nos banheiros.',
      'O ritual muda de escola para escola: dar descarga três vezes, chutar a porta, dizer palavrões diante do espelho. O final é sempre o mesmo: alguém sai correndo.'
    ],
    fonte: 'TRADIÇÃO ORAL ESCOLAR · VALE DO PARAÍBA, SP',
    gravura: '<ellipse cx="100" cy="100" rx="52" ry="70"/><ellipse cx="100" cy="100" rx="44" ry="62" stroke-opacity=".4"/><path d="M84 92 q4 -4 8 0 M108 92 q4 -4 8 0 M92 124 q8 6 16 0"/><path d="M60 196 h80 v14 h-80z M96 196 v-12 h8 v12"/><path d="M88 165 v18 M100 168 v26 M112 165 v14" stroke="#a32424"/>'
  },
  {
    id: 'saci-perere', num: '02', nome: 'Saci Pererê', original: '',
    local: 'INTERIOR DO BRASIL', ala: 'ALA BRASIL',
    periodo: 'SÉC. XVIII', tipo: 'FOLCLORE', intensidade: 2,
    frase: 'Se o redemoinho passou, ele estava dentro.',
    relato: [
      'Um menino de uma perna só, gorro vermelho e cachimbo. Nasceu da mistura de crenças indígenas, africanas e europeias e virou o rosto mais conhecido do folclore brasileiro.',
      'Ele não mata ninguém: esconde objetos, embaraça a crina dos cavalos, apaga o fogo e deixa o leite azedar. Tudo para rir de quem fica procurando.',
      'Dizem que dá para prendê-lo jogando uma peneira em cima do redemoinho e tirando o gorro dele. Sem o gorro, ele obedece.'
    ],
    fonte: 'TRADIÇÃO ORAL BRASILEIRA · MONTEIRO LOBATO, O SACI (1921)',
    gravura: '<path d="M100 40 C120 40 128 60 120 76 L80 76 C72 60 80 40 100 40Z" fill="#a32424" stroke="none"/><circle cx="100" cy="96" r="18"/><path d="M100 114 V170 M100 130 L76 150 M100 130 L124 146 M100 170 L100 214"/><path d="M118 100 h20 v-8" stroke="#d9a24a"/>'
  },
  {
    id: 'kayako-saeki', num: '02', nome: 'Kayako Saeki', original: '伽椰子',
    local: 'TÓQUIO, JAPÃO', ala: 'ALA JAPÃO',
    periodo: '2000', tipo: 'FICÇÃO CINEMATOGRÁFICA', intensidade: 5,
    frase: 'A maldição que deu origem ao filme O Grito.',
    relato: [
      'Kayako não é folclore antigo: nasceu na série Ju-On, de Takashi Shimizu, em 2000. Mas foi construída sobre uma ideia muito antiga do Japão, a de que uma morte cheia de ódio deixa uma maldição presa ao lugar.',
      'Assassinada pelo marido numa crise de ciúme, ela fica na casa. Quem entra é marcado, e a maldição segue a pessoa para onde ela for.',
      'O que a tornou inesquecível é o som: um estalo seco, vindo da garganta, descendo a escada antes dela.'
    ],
    fonte: 'JU-ON (2000) · CONCEITO DE ONRYŌ NO FOLCLORE JAPONÊS',
    gravura: '<path d="M20 220 h40 v-30 h40 v-30 h40 v-30 h40 v-30" stroke-opacity=".7"/><path d="M120 40 C118 90 124 120 116 160 M128 40 C130 90 128 130 134 170 M136 40 C140 80 136 110 142 150 M112 40 C108 80 114 110 106 140" stroke="#e8e0d0" stroke-width="1"/><circle cx="128" cy="58" r="3" fill="#e8e0d0" stroke="none"/>'
  },
  {
    id: 'kiyohime', num: '03', nome: 'Kiyohime', original: '清姫',
    local: 'WAKAYAMA, JAPÃO', ala: 'ALA JAPÃO',
    periodo: 'HEIAN', tipo: 'TRADIÇÃO DO TEMPLO DŌJŌ-JI', intensidade: 4,
    frase: 'A mulher que se transformou numa serpente de fogo.',
    relato: [
      'Um jovem monge, Anchin, pediu abrigo na casa de Kiyohime a caminho de Kumano. Ela se apaixonou. Ele prometeu voltar, e não voltou.',
      'Kiyohime o perseguiu até o rio Hidaka. Quando o barqueiro se recusou a levá-la, ela atravessou nadando, já transformada em serpente.',
      'No templo Dōjō-ji, os monges esconderam Anchin sob o grande sino de bronze. A serpente se enrolou no sino e soprou fogo até que nada restasse dentro.'
    ],
    fonte: 'DAINIHONKOKU HOKKE-KYŌKENKI, SÉC. XI · PEÇA NŌ “DŌJŌJI”',
    gravura: '<path d="M100 40 v14 M70 60 h60 M74 60 C70 120 60 160 52 190 h96 C140 160 130 120 126 60"/><path d="M64 110 h72 M58 150 h84"/><path d="M30 200 C60 170 40 130 70 120 C110 108 150 140 130 170 C112 196 150 210 176 190" stroke="#d9a24a" stroke-width="3"/><path d="M176 190 l8 -6 M176 190 l9 3" stroke="#a32424" stroke-width="2"/>'
  },
  {
    id: 'tamamo-no-mae', num: '04', nome: 'Tamamo-no-Mae', original: '玉藻前',
    local: 'TOCHIGI, JAPÃO', ala: 'ALA JAPÃO',
    periodo: 'SÉC. XII', tipo: 'KITSUNE · PEDRA MALDITA', intensidade: 4,
    frase: 'A mulher cuja morte amaldiçoou uma pedra.',
    relato: [
      'Era a cortesã mais bela e mais sábia da corte do imperador Toba. Quando o imperador adoeceu sem explicação, um adivinho percebeu o que ela era: uma raposa de nove caudas.',
      'Descoberta, ela fugiu para a planície de Nasu, onde foi caçada e morta por guerreiros. O corpo virou pedra: a Sesshō-seki, a “pedra que mata”, que soltaria um gás venenoso.',
      'Em março de 2022, visitantes encontraram a pedra partida ao meio. A notícia correu o mundo com uma pergunta: ela saiu?'
    ],
    fonte: 'OTOGIZŌSHI · SESSHŌ-SEKI, NASU (TOCHIGI)',
    gravura: '<path d="M100 150 C70 110 40 80 20 40 M100 150 C80 100 66 70 60 24 M100 150 C96 100 96 60 100 18 M100 150 C110 100 128 70 140 24 M100 150 C126 110 160 80 180 40" stroke-opacity=".55"/><path d="M44 200 C44 160 70 140 96 140 L90 170 L104 200Z" fill="#1d1a15"/><path d="M106 200 L112 172 L104 140 C130 140 156 160 156 200Z" fill="#1d1a15"/><path d="M96 140 L90 170 L104 200 M104 140 L112 172 L106 200" stroke="#d9a24a" stroke-width="2"/>'
  },
  {
    id: 'kisaragi-station', num: '05', nome: 'Kisaragi Station', original: 'きさらぎ駅',
    local: 'SHIZUOKA, JAPÃO', ala: 'ALA JAPÃO',
    periodo: '2004', tipo: 'LENDA DIGITAL', intensidade: 3,
    frase: 'A estação de trem que não existe.',
    relato: [
      'Numa madrugada de 2004, alguém com o apelido “Hasumi” começou a postar num fórum japonês: o trem que pegava todo dia não parava havia muito tempo.',
      'Quando parou, foi numa estação chamada Kisaragi, que não aparece em mapa nenhum. Sem sinal, sem táxi, só o som de tambores ao longe e um homem de uma perna só na linha do trem.',
      'Hasumi aceitou carona de um estranho. A última mensagem dizia que o carro estava indo para as montanhas. Depois, nada.'
    ],
    fonte: 'FÓRUM 2CHANNEL, JANEIRO DE 2004',
    gravura: '<rect x="50" y="50" width="100" height="34"/><path d="M100 84 v30 M70 64 h60 M80 74 h40" stroke-opacity=".6"/><path d="M20 230 L92 130 M180 230 L108 130 M50 230 L96 130 M150 230 L104 130"/><path d="M60 200 h80 M74 180 h52 M84 162 h32" stroke-opacity=".5"/><circle cx="100" cy="126" r="3" fill="#d9a24a"/>'
  },
  {
    id: 'hachishakusama', num: '06', nome: 'Hachishakusama', original: '八尺様',
    local: 'INTERIOR DO JAPÃO', ala: 'ALA JAPÃO',
    periodo: '2008', tipo: 'LENDA DIGITAL', intensidade: 5,
    frase: 'Uma mulher alta demais para passar pela porta.',
    relato: [
      'Um garoto visitando os avós no interior ouve um som estranho do outro lado da cerca viva: “po… po… po…”. Por cima da cerca, que tem mais de dois metros, aparece um chapéu branco.',
      'Os avós ficam pálidos. Hachishakusama, “a senhora de oito shaku”, escolhe um jovem e não desiste dele. O garoto passa a noite trancado num quarto com sal nos cantos e talismãs na janela.',
      'Do lado de fora, a voz do avô pede para abrir a porta. Mas o avô está ali dentro, com ele.'
    ],
    fonte: 'FÓRUM 2CHANNEL, 2008',
    gravura: '<path d="M10 170 h180 M10 170 v40 h180 v-40" stroke-opacity=".6"/><path d="M20 170 v-14 M40 170 v-18 M60 170 v-12 M80 170 v-16 M120 170 v-14 M140 170 v-18 M160 170 v-12 M180 170 v-16" stroke-opacity=".6"/><path d="M78 46 h44" stroke="#e6dccb" stroke-width="3"/><path d="M88 46 C88 30 112 30 112 46" fill="#e6dccb" stroke="#e6dccb"/><path d="M92 50 C86 90 86 130 84 170 M108 50 C114 90 114 130 116 170" stroke="#e6dccb"/>'
  },
  {
    id: 'meng-jiangnu', num: '07', nome: 'Meng Jiangnü', original: '孟姜女',
    local: 'CHINA', ala: 'ALA CHINA',
    periodo: 'DINASTIA QIN', tipo: 'UMA DAS QUATRO GRANDES LENDAS', intensidade: 2,
    frase: 'A mulher cujo choro derrubou uma muralha.',
    relato: [
      'Pouco depois do casamento, o marido de Meng Jiangnü foi levado à força para construir a Grande Muralha. Nunca mais escreveu.',
      'Quando chegou o inverno, ela atravessou o país levando roupas quentes para ele. Na muralha, os outros trabalhadores contaram: ele tinha morrido, e o corpo foi enterrado dentro da obra.',
      'Ela chorou por dias. Até que um trecho da muralha desabou e deixou à mostra os ossos que ela procurava.'
    ],
    fonte: 'TRADIÇÃO ORAL CHINESA · QUATRO GRANDES LENDAS POPULARES',
    gravura: '<path d="M20 90 h160 v110 h-160z M20 112 h160 M20 134 h160 M20 156 h160 M20 178 h160 M50 90 v22 M100 90 v22 M150 90 v22 M75 112 v22 M125 112 v22 M50 134 v22 M150 134 v22 M75 156 v22 M125 156 v22 M50 178 v22 M150 178 v22" stroke-width="1.2"/><path d="M104 88 L96 120 L110 150 L92 182 L102 204" stroke="#d9a24a" stroke-width="3"/><path d="M30 60 h20 v30 M60 60 h20 v30 M120 60 h20 v30 M150 60 h20 v30" stroke-opacity=".5"/>'
  },
  {
    id: 'kuldhara', num: '08', nome: 'Kuldhara', original: 'कुलधरा',
    local: 'RAJASTÃO, ÍNDIA', ala: 'ALA ÍNDIA',
    periodo: 'SÉC. XIX', tipo: 'POVOAÇÃO ABANDONADA', intensidade: 3,
    frase: 'A aldeia que desapareceu numa única noite.',
    relato: [
      'Kuldhara era uma aldeia próspera dos brâmanes Paliwal, perto de Jaisalmer. A lenda diz que um ministro cruel exigiu casar com a filha do chefe da aldeia.',
      'Em vez de entregar a moça, os moradores de Kuldhara e de dezenas de aldeias vizinhas partiram todos na mesma noite. Ninguém viu para onde foram.',
      'Antes de sair, teriam deixado uma maldição: ninguém mais conseguiria viver ali. As casas sem telhado continuam de pé no deserto.'
    ],
    fonte: 'TRADIÇÃO ORAL DO RAJASTÃO · SÍTIO PRESERVADO PELO GOVERNO INDIANO',
    gravura: '<circle cx="150" cy="60" r="18" stroke="#d9a24a"/><path d="M14 190 h172"/><path d="M24 190 v-40 l12 -10 l12 10 v40 M56 190 v-56 h36 v56 M100 190 v-30 l18 -14 l18 14 v30 M144 190 v-46 h30 v46"/><path d="M66 150 h6 v10 h-6z M76 150 h6 v10 h-6z M152 156 h6 v10 h-6z" stroke-opacity=".5"/><path d="M60 134 l8 -8 M80 134 l6 -6 M150 144 l6 -8" stroke-opacity=".6"/>'
  },
  {
    id: 'bakunawa', num: '09', nome: 'Bakunawa', original: '',
    local: 'FILIPINAS', ala: 'ALA FILIPINAS',
    periodo: 'PRÉ-COLONIAL', tipo: 'MITOLOGIA VISAYA', intensidade: 2,
    frase: 'A serpente que tentou devorar a última lua.',
    relato: [
      'No começo, dizem os povos visayas, o céu tinha sete luas. Uma serpente-dragão enorme subiu do mar e engoliu uma por uma.',
      'Sobrou só a nossa. Para protegê-la, os deuses a cercaram de bambu, e é por isso que dá para ver manchas escuras nela.',
      'Até hoje, em noite de eclipse, a tradição manda sair de casa batendo panelas e gritando, para que a Bakunawa se assuste e devolva a lua.'
    ],
    fonte: 'MITOLOGIA VISAYA, FILIPINAS',
    gravura: '<circle cx="100" cy="110" r="34" fill="#e6dccb" stroke="none"/><path d="M40 70 C20 120 40 180 100 186 C160 192 190 140 172 90" stroke="#d9a24a" stroke-width="3"/><path d="M40 70 l-10 -10 M40 70 l14 -6 M172 90 l10 -4 M172 90 l2 12"/><path d="M100 186 C110 214 70 230 40 222"/>'
  }
];

/* ---------------------------------------------------------
   AS 60 DO CORREDOR
   - cada lenda tem uma "zona" (a ala do corredor onde ela fica);
   - enquanto o catálogo não estiver completo, os registros que
     faltam aparecem como cartas LACRADAS. Quando tiver a lenda,
     é só adicionar o bloco dela lá em cima com a zona certa.
   --------------------------------------------------------- */
(function () {
  const ZONA_POR_ID = {
    'loira-do-banheiro': 'brasil', 'saci-perere': 'brasil',
    'kayako-saeki': 'japao', 'kiyohime': 'japao', 'tamamo-no-mae': 'japao', 'kisaragi-station': 'japao', 'hachishakusama': 'japao',
    'meng-jiangnu': 'china', 'kuldhara': 'india', 'bakunawa': 'filipinas'
  };
  const ALAS = [
    { zona: 'brasil', ala: 'ALA BRASIL', local: 'BRASIL' },
    { zona: 'japao', ala: 'ALA JAPÃO', local: 'JAPÃO' },
    { zona: 'china', ala: 'ALA CHINA', local: 'CHINA' },
    { zona: 'india', ala: 'ALA ÍNDIA', local: 'ÍNDIA' },
    { zona: 'filipinas', ala: 'ALA FILIPINAS', local: 'FILIPINAS' }
  ];
  const POR_ALA = Math.ceil(Bau.TOTAL_REGISTROS / ALAS.length);   // 12 por ala

  Bau.lendas.forEach(function (l) { l.zona = l.zona || ZONA_POR_ID[l.id] || 'brasil'; });

  const lista = [];
  ALAS.forEach(function (a) {
    const daAla = Bau.lendas.filter(function (l) { return l.zona === a.zona; });
    for (let k = daAla.length; k < POR_ALA; k++) {
      daAla.push({
        id: 'registro-' + a.zona + '-' + (k + 1), lacrada: true, zona: a.zona,
        nome: 'Registro lacrado', original: '', local: a.local, ala: a.ala,
        periodo: '—', tipo: 'AINDA NÃO CATALOGADA', intensidade: 0,
        frase: 'Alguém trancou esta história. Ainda não sabemos qual é.',
        relato: ['Este registro ainda não foi aberto. Encontre a carta pelo QR code para descobrir a lenda.'],
        fonte: '—', gravura: ''
      });
    }
    daAla.forEach(function (l) { lista.push(l); });
  });
  lista.slice(0, Bau.TOTAL_REGISTROS).forEach(function (l, i) { l.num = String(i + 1).padStart(2, '0'); });
  Bau.lendas = lista.slice(0, Bau.TOTAL_REGISTROS);
})();
