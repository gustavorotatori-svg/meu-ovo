/**
 * Servico de Validacao Fiscal SEFAZ (NFe / NFC-e)
 * Proporciona validacao de integridade e regras de negocio exigidas pela SEFAZ
 * conforme o Layout 4.00 da legislacao vigente nacional.
 */

export interface FiscalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    chaveAcesso?: string;
    modelo?: '55' | '65';
    serie?: number;
    numeroNota?: number;
    cnpjEmitente?: string;
    cnpjDestinatario?: string;
    valorTotalNota?: number;
    quantidadeItens?: number;
    ambiente?: 'Homologacao' | 'Producao';
    naturezaOperacao?: string;
    dataEmissao?: string;
  };
}

/**
 * Valida se um CNPJ eh valido matematicamente usando algoritmicamente digitos verificadores.
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) return false;

  // Evita CNPJs conhecidos invalidos
  if (/^(\d)\1{13}$/.test(cleanCnpj)) return false;

  // Primeiro digito verificador
  let tamanho = cleanCnpj.length - 2;
  let numeros = cleanCnpj.substring(0, tamanho);
  const digitos = cleanCnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  // Segundo digito verificador
  tamanho = tamanho + 1;
  numeros = cleanCnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
};

/**
 * Calcula o digito verificador da Chave de Acesso NFe usando Modulo 11 (pesos de 2 a 9).
 */
export const calculateChaveAcessoDV = (chave43: string): number => {
  if (chave43.length !== 43) return -1;
  
  let soma = 0;
  let peso = 2;
  
  for (let i = 42; i >= 0; i--) {
    soma += parseInt(chave43.charAt(i)) * peso;
    peso++;
    if (peso > 9) peso = 2;
  }
  
  const resto = soma % 11;
  if (resto === 0 || resto === 1) return 0;
  return 11 - resto;
};

/**
 * Valida se a string XML do documento atende aos padroes estruturais, matematicos e
 * fiscais exigidos pela Receita e SEFAZ (Validador de Pre-transmissao).
 */
export const validateFiscalXML = (xmlString: string): FiscalValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const metadata: FiscalValidationResult['metadata'] = {};

  if (!xmlString || xmlString.trim().length === 0) {
    return {
      isValid: false,
      errors: ['O arquivo XML fiscal fornecido esta vazio.'],
      warnings: []
    };
  }

  // 1. Parsing do XML usando DOMParser do Browser com fallback seguro
  let xmlDoc: Document;
  try {
    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new window.DOMParser();
      xmlDoc = parser.parseFromString(xmlString, 'application/xml');
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        return {
          isValid: false,
          errors: [`Falha na sintaxe do XML (Documento malformado): ${parserError.textContent}`],
          warnings: []
        };
      }
    } else {
      // Fallback em caso de execucao server-side (tsx/Node) para consistencia
      return {
        isValid: false,
        errors: ['O validador XML requer suporte do ambiente para DOMParser.'],
        warnings: []
      };
    }
  } catch (err: any) {
    return {
      isValid: false,
      errors: [`Erro critico ao processar parsing do XML: ${err.message || err}`],
      warnings: []
    };
  }

  // 2. Validacao do elemento raiz e Namespace XML NFe
  // Elementos validos raizes de notas fiscais: enviNFe, nfeProc, NFe
  const rootElement = xmlDoc.documentElement;
  const rootTagName = rootElement.tagName;
  
  const validRoots = ['enviNFe', 'nfeProc', 'NFe', 'NFE'];
  if (!validRoots.includes(rootTagName)) {
    errors.push(`Elemento raiz XML invalido: <${rootTagName}>. Esperado <NFe> ou <nfeProc> da legislacao.`);
  }

  const namespace = rootElement.getAttribute('xmlns');
  const expectedNamespace = 'http://www.portalfiscal.inf.br/nfe';
  if (namespace !== expectedNamespace) {
    warnings.push(`Namespace XML do elemento raiz (${namespace || 'Nenhum'}) difere do padrao SEFAZ nacional (${expectedNamespace}).`);
  }

  // Encontrar o no principal <infNFe> ou <infCFe>
  const infNFNode = xmlDoc.getElementsByTagName('infNFe')[0];
  if (!infNFNode) {
    return {
      isValid: false,
      errors: ['Tag crucial <infNFe> nao encontrada no XML. O documento nao representa uma NFe ou NFC-e valida.'],
      warnings
    };
  }

  // 3. Validacao do ID e Chave de Acesso
  const chaveId = infNFNode.getAttribute('Id') || '';
  if (!chaveId) {
    errors.push('O atributo ID identificador unico em <infNFe> esta ausente.');
  } else {
    if (!chaveId.startsWith('NFe')) {
      errors.push(`O identificador unico Id="${chaveId}" em <infNFe> deve obrigatoriamente comecar com o prefixo 'NFe'.`);
    }
    
    const numericPart = chaveId.replace('NFe', '');
    if (numericPart.length !== 44) {
      errors.push(`A Chave de Acesso embutida no Id="${chaveId}" possui ${numericPart.length} digitos numericos (esperado: 44 digitos).`);
    } else {
      metadata.chaveAcesso = numericPart;
      
      // Validacao do Digito Verificador (DV) da Chave de Acesso
      const first43 = numericPart.substring(0, 43);
      const expectedDV = parseInt(numericPart.charAt(43));
      const calculatedDV = calculateChaveAcessoDV(first43);
      
      if (calculatedDV !== expectedDV) {
        errors.push(`Digito Verificador (DV) da Chave de Acesso invalido. Encontrado: ${expectedDV}, Calculado logicamente: ${calculatedDV}.`);
      }

      // Validar codigo de UF da chave de acesso (Ex: 35 para SP, 31 para MG, 33 para RJ)
      const cUFChave = numericPart.substring(0, 2);
      const codigosUFValidos = [
        '11', '12', '13', '14', '15', '16', '17', '21', '22', '23', '24', '25', '26', '27', '28', '29',
        '31', '32', '33', '35', '41', '42', '43', '50', '51', '52', '53'
      ];
      if (!codigosUFValidos.includes(cUFChave)) {
        errors.push(`O codigo da UF da chave de acesso (${cUFChave}) nao corresponde a nenhum estado valido da federacao brasileira.`);
      }

      // Validar modelo da nota fiscal
      const modelChave = numericPart.substring(20, 22);
      if (modelChave !== '55' && modelChave !== '65') {
        errors.push(`Modelo fiscal incorreto na Chave de Acesso (${modelChave}). Projetado apenas 55 (NF-e) ou 65 (NFC-e).`);
      } else {
        metadata.modelo = modelChave as '55' | '65';
      }
    }
  }

  // 4. Validacao da secao de Identificacao da Nota (<ide>)
  const ideNode = xmlDoc.getElementsByTagName('ide')[0];
  if (!ideNode) {
    errors.push('Secao <ide> (Identificacao do Documento Fiscal) nao esta presente no XML.');
  } else {
    // Validar cUF
    const cUFTag = ideNode.getElementsByTagName('cUF')[0]?.textContent || '';
    if (!cUFTag) errors.push('Tag de codigo da UF (<cUF>) ausente na identificacao.');

    // Validar Modelo
    const modTag = ideNode.getElementsByTagName('mod')[0]?.textContent || '';
    if (modTag !== '55' && modTag !== '65') {
      errors.push(`Modelo fiscal (<mod>) declarado ${modTag || 'ausente'} eh invalido. SEFAZ exige '55' para NF-e ou '65' para NFC-e.`);
    }

    // Validar Serie e Numero
    const serieTag = ideNode.getElementsByTagName('serie')[0]?.textContent || '';
    const nNFTag = ideNode.getElementsByTagName('nNF')[0]?.textContent || '';
    
    if (serieTag) {
      metadata.serie = parseInt(serieTag);
      if (metadata.serie < 1 || metadata.serie > 999) {
        warnings.push(`Serie da nota (${serieTag}) fora da faixa usual (1-999).`);
      }
    } else {
      errors.push('Tag <serie> ausente na secao de identificacao.');
    }

    if (nNFTag) {
      metadata.numeroNota = parseInt(nNFTag);
      if (metadata.numeroNota <= 0) {
        errors.push('O numero fiscal da nota (<nNF>) deve ser um numero inteiro positivo maior que zero.');
      }
    } else {
      errors.push('Tag <nNF> (Numero da Nota) ausente.');
    }

    // Data de Emissao e de Fuso Horario brasileiro
    const dhEmiTag = ideNode.getElementsByTagName('dhEmi')[0]?.textContent || '';
    if (!dhEmiTag) {
      errors.push('Data e Hora de emissao da nota (<dhEmi>) ausente na identificacao.');
    } else {
      metadata.dataEmissao = dhEmiTag;
      // Validacao do formato de timezone SEFAZ (ex: 2026-05-25T13:45:00-03:00)
      const isoWithOffsetPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[-+]\d{2}:\d{2}$/;
      if (!isoWithOffsetPattern.test(dhEmiTag)) {
        errors.push(`Formato da Tag <dhEmi> (${dhEmiTag}) invalido para a SEFAZ. Deve conter representacao de data, hora e fuso horario explicitos (ex: YYYY-MM-DDTHH:MM:SS-03:00).`);
      } else {
        // Alerta caso a data de emissao difira muito da data atual
        const emissaoDate = new Date(dhEmiTag);
        const agora = new Date();
        const diferencaHoras = Math.abs(agora.getTime() - emissaoDate.getTime()) / (1000 * 60 * 60);
        if (diferencaHoras > 24) {
          warnings.push(`Diferenca de data de emissao superior a 24 horas (${diferencaHoras.toFixed(1)}h). Risco de recusa de transmissao por atraso.`);
        }
      }
    }

    // Ambiente (1 = Producao, 2 = Homologacao)
    const tpAmbTag = ideNode.getElementsByTagName('tpAmb')[0]?.textContent || '';
    if (tpAmbTag === '1') {
      metadata.ambiente = 'Producao';
    } else if (tpAmbTag === '2') {
      metadata.ambiente = 'Homologacao';
    } else {
      errors.push(`Tipo de Ambiente (<tpAmb>) invalido (${tpAmbTag || 'vazio'}). Valores aceitados: 1 para Producao ou 2 para Homologacao.`);
    }

    // Natureza da Operacao
    metadata.naturezaOperacao = ideNode.getElementsByTagName('natOp')[0]?.textContent || '';
    if (!metadata.naturezaOperacao) {
      errors.push('Natureza da Operacao (<natOp>) nao informada na nota fiscal.');
    }
  }

  // 5. Validacao dos dados do Emitente (<emit>)
  const emitNode = xmlDoc.getElementsByTagName('emit')[0];
  if (!emitNode) {
    errors.push('Secao <emit> (Dados do Emitente) nao informada no XML.');
  } else {
    // CNPJ Emitente
    const cnpjEmit = emitNode.getElementsByTagName('CNPJ')[0]?.textContent || '';
    if (!cnpjEmit) {
      errors.push('CNPJ do Emitente ausente.');
    } else {
      metadata.cnpjEmitente = cnpjEmit;
      if (!isValidCNPJ(cnpjEmit)) {
        errors.push(`CNPJ do Emitente (${cnpjEmit}) nao e valido conforme calculo de digito verificador.`);
      }
    }

    // Razao Social
    const xNomeEmit = emitNode.getElementsByTagName('xNome')[0]?.textContent || '';
    if (!xNomeEmit || xNomeEmit.trim().length < 2) {
      errors.push('Razao Social do Emitente (<xNome>) ausente ou muito curta.');
    }

    // Inscricao Estadual (IE)
    const ieEmit = emitNode.getElementsByTagName('IE')[0]?.textContent || '';
    if (!ieEmit) {
      errors.push('Inscricao Estadual (IE) do Emitente ausente.');
    } else {
      const cleanIE = ieEmit.replace(/\D/g, '');
      if (cleanIE.toLowerCase() === 'isento') {
        warnings.push('IE do Emitente declarada como ISENTO. Verifique se o regime do remetente permite.');
      }
    }

    // Codigo de Regime Tributario (CRT)
    const crtEmit = emitNode.getElementsByTagName('CRT')[0]?.textContent || '';
    if (!['1', '2', '3', '4'].includes(crtEmit)) {
      errors.push(`CRT (Regime Tributario) invalido (${crtEmit || 'ausente'}). Valores validos: 1 (Simples), 2 (Excesso RBT), 3 (Regime Normal), 4 (MEI).`);
    }

    // Endereco do Emitente
    const enderEmit = emitNode.getElementsByTagName('enderEmit')[0];
    if (!enderEmit) {
      errors.push('Endereco do Emitente (<enderEmit>) ausente.');
    } else {
      const UF = enderEmit.getElementsByTagName('UF')[0]?.textContent || '';
      const cMun = enderEmit.getElementsByTagName('cMun')[0]?.textContent || '';
      const CEP = enderEmit.getElementsByTagName('CEP')[0]?.textContent || '';

      if (!UF || UF.length !== 2) errors.push('Estado (UF) do emitente deve conter exatamente 2 caracteres.');
      if (!cMun || cMun.length !== 7) errors.push('Codigo Municipio do do emitente (IBGE - <cMun>) deve possuir exatamente 7 digitos.');
      if (!CEP || CEP.replace(/\D/g, '').length !== 8) errors.push('CEP do emitente incorreto (deve conter 8 digitos).');
    }
  }

  // 6. Validacao do Destinatario (<dest>)
  const destNode = xmlDoc.getElementsByTagName('dest')[0];
  if (!destNode) {
    if (metadata.modelo === '55') {
      errors.push('Destinatario (<dest>) nao informado. Obrigatorio para NFe Modelo 55.');
    } else if (metadata.modelo === '65') {
      // Para NFC-e e opcional se o valor for pequeno, adiciona aviso
      warnings.push('Nao ha destinatario identificado (NFC-e anonima). Permitido apenas para transacoes abaixo do limite legal local.');
    }
  } else {
    const cnpjDest = destNode.getElementsByTagName('CNPJ')[0]?.textContent || '';
    const cpfDest = destNode.getElementsByTagName('CPF')[0]?.textContent || '';
    
    if (cnpjDest) {
      metadata.cnpjDestinatario = cnpjDest;
      if (!isValidCNPJ(cnpjDest)) {
        errors.push(`CNPJ do Destinatario (${cnpjDest}) invalido matematicamente.`);
      }
    } else if (cpfDest) {
      metadata.cnpjDestinatario = cpfDest; // Map to unified field
      const cleanCPF = cpfDest.replace(/\D/g, '');
      if (cleanCPF.length !== 11) {
        errors.push(`CPF do Destinatario (${cpfDest}) incoerente para transmissao (deve conter 11 digitos).`);
      }
    } else if (metadata.modelo === '55') {
      errors.push('Destinatario de Modelo 55 exige identificacao obrigatoria de CNPJ, CPF ou IdEstrangeiro.');
    }
  }

  // 7. Validacao dos Itens e Produtos (<det>)
  const detNodes = xmlDoc.getElementsByTagName('det');
  if (detNodes.length === 0) {
    errors.push('Nenhum item ou mercadoria especificado em tags <det>. A nota fiscal deve conter ao menos 1 item corporativo.');
  } else {
    metadata.quantidadeItens = detNodes.length;
    let computedItemsTotal = 0;

    for (let i = 0; i < detNodes.length; i++) {
      const itemNode = detNodes[i];
      const itemIndex = i + 1;
      const nItem = itemNode.getAttribute('nItem') || '';

      if (parseInt(nItem) !== itemIndex) {
        warnings.push(`Sequencia incompativel de item no atributo nItem="${nItem}" do indice ${itemIndex}`);
      }

      const prodNode = itemNode.getElementsByTagName('prod')[0];
      if (!prodNode) {
        errors.push(`Estrutura do item #${itemIndex} incorreta: tag <prod> ausente.`);
        continue;
      }

      // Codigo do produto e Descricao
      const cProd = prodNode.getElementsByTagName('cProd')[0]?.textContent || '';
      const xProd = prodNode.getElementsByTagName('xProd')[0]?.textContent || '';
      
      if (!cProd) errors.push(`Codigo do produto do item #${itemIndex} esta em branco ou ausente.`);
      if (!xProd || xProd.trim().length < 2) errors.push(`Descricao comercial (<xProd>) do item #${itemIndex} invalida.`);

      // Mercadoria NCM (Nomenclatura Comum Mercosul)
      const ncm = prodNode.getElementsByTagName('NCM')[0]?.textContent || '';
      if (!ncm) {
        errors.push(`NCM do item #${itemIndex} (Codigo Mercosul) e uma informacao obrigatoria.`);
      } else {
        const cleanNcm = ncm.replace(/\D/g, '');
        if (cleanNcm.length !== 8) {
          errors.push(`Codigo NCM (${ncm}) do item #${itemIndex} invalido. Deve possuir exatamente 8 digitos numericos.`);
        }
      }

      // Parametro CFOP (Codigo Fiscal de Operacoes e Prestacoes)
      const cfop = prodNode.getElementsByTagName('CFOP')[0]?.textContent || '';
      if (!cfop) {
        errors.push(`CFOP do item #${itemIndex} obrigatorio.`);
      } else {
        const cleanCfop = cfop.replace(/\D/g, '');
        if (cleanCfop.length !== 4) {
          errors.push(`CFOP fiscal (${cfop}) do item #${itemIndex} incorreto. Deve possuir 4 digitos.`);
        }
      }

      // Quantidade e Valor Unitario
      const qCom = parseFloat(prodNode.getElementsByTagName('qCom')[0]?.textContent || '0');
      const vUnCom = parseFloat(prodNode.getElementsByTagName('vUnCom')[0]?.textContent || '0');
      const vProd = parseFloat(prodNode.getElementsByTagName('vProd')[0]?.textContent || '0');

      if (qCom <= 0) errors.push(`Quantidade comercial (<qCom>) do item #${itemIndex} deve ser positiva.`);
      if (vUnCom <= 0) errors.push(`Valor unitario (<vUnCom>) do item #${itemIndex} deve ser positivo.`);
      
      // Checa se o valor do produto corresponde arithmeticamente a Qtd * ValorUnit
      const expectedvProd = parseFloat((qCom * vUnCom).toFixed(2));
      const difference = Math.abs(expectedvProd - vProd);
      if (difference > 0.05) {
        warnings.push(`Diferenca de calculo fiscal no item #${itemIndex}. Multiplicacao de Qtd e Valor Unitario: ${expectedvProd}, vProd Declarado: ${vProd}.`);
      }

      computedItemsTotal += vProd;

      // Impostos do Item
      const impNode = itemNode.getElementsByTagName('imposto')[0];
      if (!impNode) {
        errors.push(`Informacoes tributarias (<imposto>) do item #${itemIndex} ausentes.`);
      } else {
        // Valida se possui declaracao de ICMS
        const icms = impNode.getElementsByTagName('ICMS')[0];
        if (!icms) {
          errors.push(`Declaracao de ICMS do item #${itemIndex} ausente.`);
        }
      }
    }

    // 8. Validacao e Consistencia de Totais da Nota (<total>)
    const totalNode = xmlDoc.getElementsByTagName('total')[0];
    if (!totalNode) {
      errors.push('Tag de calculo de totais <total> ausente do documento fiscal.');
    } else {
      const icmsTot = totalNode.getElementsByTagName('ICMSTot')[0];
      if (!icmsTot) {
        errors.push('Resumo central de impostos <ICMSTot> nao informado dentro do total.');
      } else {
        const totalVProd = parseFloat(icmsTot.getElementsByTagName('vProd')[0]?.textContent || '0');
        const vDesc = parseFloat(icmsTot.getElementsByTagName('vDesc')[0]?.textContent || '0');
        const vFrete = parseFloat(icmsTot.getElementsByTagName('vFrete')[0]?.textContent || '0');
        const vSeg = parseFloat(icmsTot.getElementsByTagName('vSeg')[0]?.textContent || '0');
        const vOutro = parseFloat(icmsTot.getElementsByTagName('vOutro')[0]?.textContent || '0');
        const vNF = parseFloat(icmsTot.getElementsByTagName('vNF')[0]?.textContent || '0');
        
        metadata.valorTotalNota = vNF;

        // Validar se soma dos items bate com o total declarado das mercadorias
        const diffItems = Math.abs(computedItemsTotal - totalVProd);
        if (diffItems > 0.10) {
          errors.push(`Inconsistencia de valores: A soma matematica dos produtos individuais (R$ ${computedItemsTotal.toFixed(2)}) difere do total de produtos declarado em ICMSTot (<vProd>: R$ ${totalVProd.toFixed(2)}).`);
        }

        // Validar calculo geral do total da nota: vProd - vDesc + vFrete + vSeg + vOutro + impostos etc = vNF
        // Simplificadamente em operacoes basicas de delivery/restaurante: vNF e composto por vProd - vDesc + frete + outro
        const expectedVNF = parseFloat((totalVProd - vDesc + vFrete + vSeg + vOutro).toFixed(2));
        const diffNF = Math.abs(expectedVNF - vNF);
        if (diffNF > 0.05) {
          errors.push(`O valor total da nota liquida (<vNF>: R$ ${vNF.toFixed(2)}) difere do calculo aritmetico esperado (Prod - Desc + Frete + Outros: R$ ${expectedVNF.toFixed(2)}).`);
        }
      }
    }
  }

  // 9. Validacao basica de Segurança de Entrada de Dados (Anti-Injecoes)
  const dangerousPatterns = [
    /UNION\s+SELECT/i,
    /<\s*script/i,
    /exec\s*\(\s*xp_cmdshell/i,
    /OR\s+1\s*=\s*1/i
  ];
  if (dangerousPatterns.some(pat => pat.test(xmlString))) {
    errors.push('O XML contem caracteres ou padroes de strings suspeitos de injecao ou invasivos.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata
  };
};

/**
 * Auxiliar para gerar um XML de teste minimo perfeitamente estruturado e valido
 * para homologacao que passe no validador.
 */
export const generateDemoValidFiscalXML = (params: {
  cnpjEmitente: string;
  cnpjDestinatario?: string;
  serie?: string;
  numeroNota?: string;
  valorTotal?: number;
  environment?: '1' | '2';
}): string => {
  const cnpjEmit = params.cnpjEmitente.replace(/\D/g, '') || '00000000000000';
  const cnpjDest = params.cnpjDestinatario?.replace(/\D/g, '') || '';
  const serie = params.serie || '1';
  const numero = params.numeroNota || '101';
  const environment = params.environment || '2';
  
  const formattedSerie = serie.padStart(3, '0');
  const formattedNumero = numero.padStart(9, '0');
  
  // Constroi os primeiros 43 digitos da chave de acesso para gerar digito valido
  // Layout chave de acesso de NFe:
  // cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9) + tpEmis(1) + cNF(8) + cDV(1)
  const cUF = '35'; // SP
  const data = '2605'; // Maio 2026
  const mod = '65'; // NFC-e
  const tpEmis = '1'; // Emissão normal
  const cNF = '84729104'; // Codigo numerico aleatorio
  
  const partialKey = `${cUF}${data}${cnpjEmit}${mod}${formattedSerie}${formattedNumero}${tpEmis}${cNF}`;
  const dv = calculateChaveAcessoDV(partialKey);
  const fullChave = `${partialKey}${dv}`;

  const valorTotal = params.valorTotal || 50.00;
  
  // Formatacao de Data no formato SEFAZ com fuso horario -03:00
  const dhEmi = '2026-05-25T13:45:00-03:00';

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${fullChave}" versao="4.00">
      <ide>
        <cUF>${cUF}</cUF>
        <cNF>${cNF}</cNF>
        <natOp>Venda de mercadoria</natOp>
        <mod>${mod}</mod>
        <serie>${parseInt(serie)}</serie>
        <nNF>${parseInt(numero)}</nNF>
        <dhEmi>${dhEmi}</dhEmi>
        <tpImp>4</tpImp>
        <tpEmis>${tpEmis}</tpEmis>
        <cDV>${dv}</cDV>
        <tpAmb>${environment}</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${cnpjEmit}</CNPJ>
        <xNome>RESTAURANTE COMIDA CASEIRA LTDA</xNome>
        <xFant>CASA GRANDE</xFant>
        <enderEmit>
          <xLgr>Avenida Central</xLgr>
          <nro>100</nro>
          <xBairro>Centro</xBairro>
          <cMun>3550308</cMun>
          <xMun>Sao Paulo</xMun>
          <UF>SP</UF>
          <CEP>01001000</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
        </enderEmit>
        <IE>110042490114</IE>
        <CRT>1</CRT>
      </emit>
      ${cnpjDest ? `
      <dest>
        <CNPJ>${cnpjDest}</CNPJ>
        <xNome>CONSUMIDOR DE TESTES COBRANCA</xNome>
        <enderDest>
          <xLgr>Rua Secundaria</xLgr>
          <nro>400</nro>
          <xBairro>Bairro Novo</xBairro>
          <cMun>3550308</cMun>
          <xMun>Sao Paulo</xMun>
          <UF>SP</UF>
          <CEP>01301000</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
        </enderDest>
        <IE>ISENTO</IE>
      </dest>
      ` : `
      <dest>
        <CPF>00000000000</CPF>
        <xNome>CONSUMIDOR FINAL</xNome>
      </dest>
      `}
      <det nItem="1">
        <prod>
          <cProd>000001</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>Refeicao Prato Executivo</xProd>
          <NCM>21069090</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>${valorTotal.toFixed(4)}</vUnCom>
          <vProd>${valorTotal.toFixed(2)}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>1.0000</qTrib>
          <vUnTrib>${valorTotal.toFixed(4)}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <vTotTrib>6.50</vTotTrib>
          <ICMS>
            <ICMSSN102>
              <orig>0</orig>
              <CSOSN>102</CSOSN>
            </ICMSSN102>
          </ICMS>
          <PIS>
            <PISOutr>
              <CST>99</CST>
              <vBC>0.00</vBC>
              <pPIS>0.0000</pPIS>
              <vPIS>0.00</vPIS>
            </PISOutr>
          </PIS>
          <COFINS>
            <COFINSOutr>
              <CST>99</CST>
              <vBC>0.00</vBC>
              <pCOFINS>0.0000</pCOFINS>
              <vCOFINS>0.00</vCOFINS>
            </COFINSOutr>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${valorTotal.toFixed(2)}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${valorTotal.toFixed(2)}</vNF>
          <vTotTrib>6.50</vTotTrib>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <pag>
        <detPag>
          <tPag>15</tPag>
          <vPag>${valorTotal.toFixed(2)}</vPag>
        </detPag>
      </pag>
    </infNFe>
  </NFe>
</nfeProc>`;
};
