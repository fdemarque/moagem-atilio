/**
 * Utilitários para Autenticação Biométrica via WebAuthn API
 * Focado no uso de impressão digital (leitor biométrico nativo de celulares Android / iOS / PCs)
 */

const CHAVE_CREDENTIAL_ID = 'moagem_biometria_credencial';
const CHAVE_USUARIO_DADOS = 'moagem_biometria_usuario';

/**
 * Converte um ArrayBuffer para string Base64
 */
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converte uma string Base64 (ou Base64URL) para ArrayBuffer
 */
export function base64ToBuffer(base64) {
  let standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (standardBase64.length % 4) {
    standardBase64 += '=';
  }
  const binary = atob(standardBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Gera um challenge aleatório em formato Uint8Array (32 bytes)
 */
export function gerarChallenge() {
  const challenge = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(challenge);
  } else {
    for (let i = 0; i < 32; i++) {
      challenge[i] = Math.floor(Math.random() * 256);
    }
  }
  return challenge;
}

/**
 * Verifica se o dispositivo e o navegador possuem suporte à biometria na plataforma
 */
export async function isBiometricsSupported() {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
    return false;
  }

  try {
    const disponivel = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return Boolean(disponivel);
  } catch (err) {
    console.warn('Erro ao verificar suporte biométrico:', err);
    return false;
  }
}

/**
 * Registra a credencial biométrica usando o leitor de digital nativo do celular
 */
export async function registrarBiometria(usuarioNome = 'operador') {
  if (!window.PublicKeyCredential) {
    throw new Error('Biometria não suportada neste navegador.');
  }

  const challenge = gerarChallenge();
  const userId = new TextEncoder().encode(usuarioNome);

  const publicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Moagem Atílio'
    },
    user: {
      id: userId,
      name: usuarioNome,
      displayName: `Moagem Atílio (${usuarioNome})`
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256 (Padrão Android/Chrome)
      { alg: -257, type: 'public-key' }  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      requireResidentKey: false
    },
    timeout: 60000,
    attestation: 'none'
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions
  });

  if (!credential || !credential.rawId) {
    throw new Error('Nenhuma credencial biométrica foi criada.');
  }

  const credentialIdBase64 = bufferToBase64(credential.rawId);
  return credentialIdBase64;
}

/**
 * Autentica o usuário solicitando a leitura da digital
 */
export async function autenticarComBiometria(credentialIdBase64) {
  if (!window.PublicKeyCredential) {
    throw new Error('Biometria não suportada neste navegador.');
  }

  const challenge = gerarChallenge();
  const allowCredentials = [];

  if (credentialIdBase64) {
    allowCredentials.push({
      id: base64ToBuffer(credentialIdBase64),
      type: 'public-key',
      transports: ['internal']
    });
  }

  const publicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials,
    userVerification: 'required',
    timeout: 60000
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions
  });

  if (!assertion) {
    throw new Error('A leitura da digital não foi concluída.');
  }

  return assertion;
}

/**
 * Recupera os dados da biometria salvos no localStorage
 */
export function getBiometriaSalva() {
  try {
    const credId = localStorage.getItem(CHAVE_CREDENTIAL_ID);
    const usuarioRaw = localStorage.getItem(CHAVE_USUARIO_DADOS);
    if (credId && usuarioRaw) {
      return {
        credentialId: credId,
        usuario: JSON.parse(usuarioRaw)
      };
    }
  } catch (err) {
    console.warn('Erro ao carregar credencial biométrica local:', err);
  }
  return null;
}

/**
 * Salva a credencial biométrica e os dados do usuário no localStorage
 */
export function salvarBiometriaLocal(credentialId, dadosUsuario) {
  try {
    localStorage.setItem(CHAVE_CREDENTIAL_ID, credentialId);
    localStorage.setItem(CHAVE_USUARIO_DADOS, JSON.stringify(dadosUsuario));
    return true;
  } catch (err) {
    console.warn('Erro ao salvar biometria localmente:', err);
    return false;
  }
}

/**
 * Remove a biometria salva do dispositivo
 */
export function removerBiometriaLocal() {
  try {
    localStorage.removeItem(CHAVE_CREDENTIAL_ID);
    localStorage.removeItem(CHAVE_USUARIO_DADOS);
  } catch (err) {
    console.warn('Erro ao remover biometria:', err);
  }
}
