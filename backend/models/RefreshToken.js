const crypto = require('crypto');
const supabase = require('../config/supabase');

class RefreshToken {
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async createToken({ userId, token, expiresAt, userAgent = null, ipAddress = null }) {
    const tokenHash = this.hashToken(token);
    const { data, error } = await supabase
      .from('refresh_tokens')
      .insert([{
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        user_agent: userAgent,
        ip_address: ipAddress
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findValidToken(token) {
    const tokenHash = this.hashToken(token);
    const { data, error } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    if (new Date(data.expires_at) <= new Date()) {
      await this.revokeToken(token);
      return null;
    }

    return data;
  }

  static async revokeToken(token) {
    const tokenHash = this.hashToken(token);
    const { error } = await supabase
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('revoked_at', null);

    if (error) throw error;
    return true;
  }
}

module.exports = RefreshToken;
