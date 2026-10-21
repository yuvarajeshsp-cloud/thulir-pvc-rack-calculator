// dist is the canonical static source; www adds the native bridge.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
fs.cpSync(path.join(root,'dist'),path.join(root,'www'),{recursive:true});
const index=path.join(root,'www/index.html');
fs.writeFileSync(index,fs.readFileSync(index,'utf8').replace('</body>','<script src="mobile.js"></script></body>'));
