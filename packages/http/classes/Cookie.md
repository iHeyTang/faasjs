[@faasjs/http](../README.md) / Cookie

# Class: Cookie\<C, S\>

## Type parameters

• **C** extends `Record`\<`string`, `string`\> = `any`

• **S** extends `Record`\<`string`, `string`\> = `any`

## Constructors

### new Cookie(config, logger)

> **new Cookie**\<`C`, `S`\>(`config`, `logger`?): [`Cookie`](Cookie.md)\<`C`, `S`\>

#### Parameters

• **config**: [`CookieOptions`](../type-aliases/CookieOptions.md)

• **logger?**: `Logger`

#### Returns

[`Cookie`](Cookie.md)\<`C`, `S`\>

## Properties

### config

> **`readonly`** **config**: `Object`

#### config.domain?

> **`optional`** **domain**: `string`

#### config.expires

> **expires**: `number`

#### config.httpOnly

> **httpOnly**: `boolean`

#### config.path

> **path**: `string`

#### config.sameSite?

> **`optional`** **sameSite**: `"Strict"` \| `"Lax"` \| `"None"`

#### config.secure

> **secure**: `boolean`

#### config.session

> **session**: [`SessionOptions`](../type-aliases/SessionOptions.md)

### content

> **content**: `Record`\<`string`, `string`\>

### logger

> **logger**: `Logger`

### session

> **session**: [`Session`](Session.md)\<`S`, `C`\>

## Methods

### headers()

> **headers**(): `Object`

#### Returns

`Object`

##### Set-Cookie?

> **`optional`** **Set-Cookie**: `string`[]

### invoke()

> **invoke**(`cookie`, `logger`): [`Cookie`](Cookie.md)\<`C`, `S`\>

#### Parameters

• **cookie**: `string`

• **logger**: `Logger`

#### Returns

[`Cookie`](Cookie.md)\<`C`, `S`\>

### read()

> **read**(`key`): `any`

#### Parameters

• **key**: `string`

#### Returns

`any`

### write()

> **write**(`key`, `value`, `opts`?): [`Cookie`](Cookie.md)\<`C`, `S`\>

#### Parameters

• **key**: `string`

• **value**: `string`

• **opts?**

• **opts\.domain?**: `string`

• **opts\.expires?**: `string` \| `number`

• **opts\.httpOnly?**: `boolean`

• **opts\.path?**: `string`

• **opts\.sameSite?**: `"Strict"` \| `"Lax"` \| `"None"`

• **opts\.secure?**: `boolean`

#### Returns

[`Cookie`](Cookie.md)\<`C`, `S`\>
