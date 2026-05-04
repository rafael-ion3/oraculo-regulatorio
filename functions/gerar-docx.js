export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { estrutura, nomeArquivo } = await context.request.json();

    // Chamar Claude para gerar o DOCX como base64 via script Node
    // Como o Cloudflare Workers não tem acesso ao filesystem,
    // vamos gerar o HTML do documento e converter para DOCX via LibreOffice online
    // OU gerar um RTF simples que o Word abre nativamente

    // Gerar RTF profissional (suportado nativamente pelo Word)
    const rtf = gerarRTF(estrutura, nomeArquivo);

    return new Response(rtf, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/rtf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(nomeArquivo)}.rtf"`,
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

function gerarRTF(estrutura, titulo) {
  const data = estrutura.data || new Date().toLocaleDateString('pt-BR');
  
  let rtf = '{\\rtf1\\ansi\\deff0\n';
  rtf += '{\\fonttbl{\\f0 Arial;}}\n';
  rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red26\\green65\\blue153;\\red108\\green108\\blue108;}\n';
  rtf += '\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440\n';

  // Cabeçalho
  rtf += '\\pard\\qc{\\f0\\fs28\\b\\cf2 ' + esc(estrutura.titulo || titulo) + '}\\par\n';
  if(estrutura.subtitulo){
    rtf += '\\pard\\qc{\\f0\\fs22\\cf3 ' + esc(estrutura.subtitulo) + '}\\par\n';
  }
  rtf += '\\pard\\qc{\\f0\\fs20\\cf3 ' + esc(data) + '}\\par\n';
  rtf += '\\pard\\brdrb\\brdrs\\brdrw10\\brdrsp20\\par\n';
  rtf += '\\par\n';

  // Seções
  for(const sec of (estrutura.secoes || [])){
    if(sec.tipo === 'h1'){
      rtf += '\\pard{\\f0\\fs26\\b\\cf2 ' + esc(sec.texto) + '}\\par\n\\par\n';
    } else if(sec.tipo === 'h2'){
      rtf += '\\pard{\\f0\\fs23\\b ' + esc(sec.texto) + '}\\par\n';
    } else if(sec.tipo === 'p'){
      rtf += '\\pard\\fi0\\li0{\\f0\\fs21 ' + esc(sec.texto) + '}\\par\n\\par\n';
    } else if(sec.tipo === 'li'){
      rtf += '\\pard\\fi-360\\li720{\\f0\\fs21 \\bullet\\tab ' + esc(sec.texto) + '}\\par\n';
    } else if(sec.tipo === 'aviso'){
      rtf += '\\par\\pard\\box\\brdrs\\brdrw10{\\f0\\fs19\\i\\cf3 ' + esc(sec.texto) + '}\\par\n\\par\n';
    } else if(sec.tipo === 'table' && sec.cabecalho && sec.linhas){
      // Tabela simples em RTF
      const nCols = sec.cabecalho.length;
      const colW = Math.floor(8640 / nCols);
      // Cabeçalho
      rtf += '\\trowd\\trgaph108\n';
      for(let i=0;i<nCols;i++) rtf += `\\cellx${colW*(i+1)}\n`;
      rtf += '\\pard\\intbl{\\b ' + sec.cabecalho.map(esc).join('}\\cell{\\b ') + '}\\cell\\row\n';
      // Linhas
      for(const linha of sec.linhas){
        rtf += '\\trowd\\trgaph108\n';
        for(let i=0;i<nCols;i++) rtf += `\\cellx${colW*(i+1)}\n`;
        rtf += '\\pard\\intbl{' + linha.map(esc).join('}\\cell{') + '}\\cell\\row\n';
      }
      rtf += '\\par\n';
    }
  }

  rtf += '}';
  return rtf;
}

function esc(str) {
  if(!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0)}?`);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}
