import { contactLinks, displayPhone, hasReachableContact, NATIONAL_SERVICES } from './helpContacts';

describe('NATIONAL_SERVICES', () => {
  it('lists SEJIWA and 112, both still awaiting verification by the team', () => {
    expect(NATIONAL_SERVICES).toEqual([
      { name: 'SEJIWA', description: 'Layanan dukungan kesehatan jiwa', phone: '119,8', verified: false },
      { name: 'Darurat', description: 'Kalau kamu butuh bantuan segera', phone: '112', verified: false },
    ]);
  });
});

describe('contactLinks', () => {
  it('turns an Indonesian 08xx number into a tel: link and a wa.me/628xx link', () => {
    expect(contactLinks({ phone: '0812-3456-789' })).toEqual({
      call: 'tel:08123456789',
      whatsapp: 'https://wa.me/628123456789',
    });
  });

  it('accepts +62 and 62 prefixes, spaces, dots and parentheses', () => {
    expect(contactLinks({ phone: '+62 812 3456 789' }).whatsapp).toBe('https://wa.me/628123456789');
    expect(contactLinks({ phone: '+62 812 3456 789' }).call).toBe('tel:+628123456789');
    expect(contactLinks({ phone: '62.812.3456.789' }).whatsapp).toBe('https://wa.me/628123456789');
    expect(contactLinks({ phone: '(0812) 3456-789' }).call).toBe('tel:08123456789');
  });

  it('keeps a dial pause for extensions and offers no WhatsApp for short service numbers', () => {
    expect(contactLinks({ phone: '119,8' })).toEqual({ call: 'tel:119,8' });
    expect(contactLinks({ phone: '112' })).toEqual({ call: 'tel:112' });
  });

  it('offers no WhatsApp for a landline-style number that is not a mobile number', () => {
    expect(contactLinks({ phone: '021-5551234' }).whatsapp).toBeUndefined();
    expect(contactLinks({ phone: '021-5551234' }).call).toBe('tel:0215551234');
  });

  it('returns nothing for empty or missing values', () => {
    expect(contactLinks({ phone: null, url: null })).toEqual({});
    expect(contactLinks({ phone: '   ', url: '  ' })).toEqual({});
    expect(contactLinks({})).toEqual({});
  });

  it('opens web links over https, adding the scheme when it is missing', () => {
    expect(contactLinks({ url: 'https://ugm.ac.id/konseling' }).web).toBe('https://ugm.ac.id/konseling');
    expect(contactLinks({ url: 'http://kampus.ac.id' }).web).toBe('http://kampus.ac.id');
    expect(contactLinks({ url: ' kampus.ac.id/bk ' }).web).toBe('https://kampus.ac.id/bk');
  });

  it('refuses links with other schemes', () => {
    expect(contactLinks({ url: 'javascript:alert(1)' }).web).toBeUndefined();
    expect(contactLinks({ url: 'file:///data' }).web).toBeUndefined();
  });
});

describe('displayPhone', () => {
  it('shows a dial pause as an extension', () => {
    expect(displayPhone('119,8')).toBe('119 ext 8');
    expect(displayPhone('112')).toBe('112');
  });
});

describe('hasReachableContact', () => {
  it('needs a phone number or a link, not just a name', () => {
    expect(hasReachableContact(null)).toBe(false);
    expect(hasReachableContact({ name: 'Rina', phone: null, url: null })).toBe(false);
    expect(hasReachableContact({ name: 'Rina', phone: ' ', url: '' })).toBe(false);
    expect(hasReachableContact({ name: '', phone: '0812', url: null })).toBe(true);
    expect(hasReachableContact({ name: '', phone: null, url: 'kampus.ac.id' })).toBe(true);
  });
});
