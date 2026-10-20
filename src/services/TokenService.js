import { createRemoteJWKSet, jwtVerify } from 'jose';

// Valida o JWT RS256 do marketplace-auth pela chave pública publicada no JWKS.
// `jwks` é a função resolvedora do jose: remota em produção, local nos testes.
export default class TokenService {
    constructor(jwks, issuer) {
        this.jwks = jwks;
        this.issuer = issuer;
    }

    static remote({ authUrl, jwtIssuer, jwksCacheMs }) {
        const url = new URL('/.well-known/jwks.json', authUrl);
        return new TokenService(createRemoteJWKSet(url, { cacheMaxAge: jwksCacheMs }), jwtIssuer);
    }

    /**
     * @returns {{ sub: string, email: string, name: string, role: string }}
     */
    async verify(token) {
        const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer, algorithms: ['RS256'] });
        return { sub: payload.sub, email: payload.email, name: payload.name, role: payload.role };
    }
}
