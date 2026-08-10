const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  API_BASE: 'https://www.smile.one/smilecode/api/',
  WEBSITE: 'https://www.smile.one/',
  API_KEY: 'SmileCode-7f6b-7a96-4487dc7c2348',
  CLIENT_ID: 'SmileCode-6a2fc820de5db',
  SECRET_KEY: 'SmileCode-0d1f265980ed4c8b-9d318e1da900e36e',
  PORT: 3000
};

function b64url(d){let s=(typeof d==='string')?Buffer.from(d,'utf-8').toString('base64'):d.toString('base64');return s.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function makeJWT(method,params,iat,exp){var rid=Date.now().toString(36)+Math.random().toString(36).substr(2,9);var hdr={alg:'HS256',typ:'JWT','sc-api-key':CONFIG.API_KEY,'sc-api-version':'2.0'};var pay={jsonrpc:'2.0',id:rid,method:method,'sc-client-id':CONFIG.CLIENT_ID,iat:iat,exp:exp,params:Object.assign({},params||{},{iat:iat,exp:exp})};var eH=b64url(JSON.stringify(hdr)),eP=b64url(JSON.stringify(pay)),uns=eH+'.'+eP;var sig=crypto.createHmac('sha256',CONFIG.SECRET_KEY).update(uns).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');return{jwt:uns+'.'+sig,rid:rid}}

function httpReq(url,opts,body,mr){mr=mr||5;return new Promise(function(ok,no){var u;try{u=new URL(url)}catch(e){return no(e)}var h=u.protocol==='https:'?https:http;var ro={hostname:u.hostname,port:u.port||(u.protocol==='https:'?443:80),path:u.pathname+u.search,method:opts.method||'GET',headers:opts.headers||{}};var r=h.request(ro,function(res){if([301,302,303,307,308].indexOf(res.statusCode)!==-1&&res.headers.location){if(mr<=0){return no(new Error('Too many redirects'))}res.resume();httpReq(new URL(res.headers.location,url).href,opts,body,mr-1).then(ok).catch(no);return}var d='';res.setEncoding('utf-8');res.on('data',function(c){d+=c});res.on('end',function(){ok({status:res.statusCode,headers:res.headers,body:d})})});r.on('error',no);r.on('timeout',function(){r.destroy();no(new Error('Timeout'))});r.setTimeout(15000);if(body)r.write(body);r.end()})}

async function callAPI(method,params){var now=Math.floor(Date.now()/1000),iat=now-300,exp=now+7500;var jr=makeJWT(method,params,iat,exp);var p=Object.assign({},params||{},{iat:iat,exp:exp});var body=JSON.stringify({jsonrpc:'2.0',id:jr.rid,method:method,params:p});var resp=await httpReq(CONFIG.API_BASE,{method:'POST',headers:{'Content-Type':'application/json','Sc-Api-Key':CONFIG.API_KEY,'Sc-Api-Version':'2.0','Authorization':'Bearer '+jr.jwt,'Content-Length':Buffer.byteLength(body)}},body);if(resp.status!==200)throw new Error('HTTP '+resp.status+': '+resp.body.substring(0,200));var d;try{d=JSON.parse(resp.body)}catch(e){throw new Error('Bad JSON')}if(d.error)throw new Error('API '+d.error.code+': '+(d.error.message||JSON.stringify(d.error)));return d.result}

// ============ SCRAPER ============

function extractPageData(html){
  var r={};
  var pcm=html.match(/pay_channel\s*=\s*['"]([^'"]*)['"]/);if(pcm)r.payChannel=pcm[1];
  var pim=html.match(/productid\s*=\s*['"]?(\d+)['"]?/);if(pim)r.productId=pim[1];
  var cm=html.match(/country\s*=\s*["']([^"']+)["']/);if(cm)r.country=cm[1];
  var tm=html.match(/<title>([^<]+)<\/title>/i);if(tm)r.title=tm[1].trim();
  var im=html.match(/info\s*=\s*JSON\.parse\('([\s\S]+?)'\)/);
  if(im){try{var is=im[1].replace(/\\'/g,"'").replace(/\\\\/g,'\\');r.infoData=JSON.parse(is);r.skuIds=Object.keys(r.infoData);
    r.websiteSkus=r.skuIds.map(function(id){var info=r.infoData[id];var e={id:id};var methods=Object.keys(info);for(var i=0;i<methods.length;i++){if(info[methods[i]].discount_total_amount){e.smilecoin=info[methods[i]].discount_total||info[methods[i]].total_amount;e.smilecoinAmount=info[methods[i]].discount_total_amount||info[methods[i]].total_amount_amount;break}}var n129=info.n129||info.n118002||info.n107;if(n129){e.displayPrice=n129.discount_total||n129.total_amount;e.displayAmount=n129.discount_total_amount||n129.total_amount_amount}return e})}catch(e){r.infoParseError=e.message}}
  var crm=html.match(/js_checkrole_url\s*=\s*['"]([^'"]+)['"]/);if(crm)r.checkroleUrl=crm[1];
  var qm=html.match(/js_query_url\s*=\s*['"]([^'"]+)['"]/);if(qm)r.queryUrl=qm[1];
  var slm=html.match(/js_getserverlist_url\s*=\s*['"]([^'"]+)['"]/);if(slm)r.serverListUrl=slm[1];
  var nm=html.match(/js_nickname_url\s*=\s*['"]([^'"]+)['"]/);if(nm)r.nicknameUrl=nm[1];
  var chm=html.match(/channel_method\s*=\s*['"]([^'"]*)['"]/);if(chm)r.channelMethod=chm[1];
  var fem=html.match(/form_missing_uid_error/);if(fem)r.needsUserId=true;
  var fzm=html.match(/form_missing_zone_error|form_missing_server_error/);if(fzm)r.needsServer=true;
  return r;
}

async function scrapePage(url){try{var resp=await httpReq(url,{method:'GET',headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36','Accept':'text/html','Accept-Language':'en-US,en'}},null);if(resp.status!==200)return{url:url,error:'HTTP '+resp.status};var d=extractPageData(resp.body);d.url=url;return d}catch(e){return{url:url,error:e.message}}}

// ============ DISCOVERY ============

async function discoverAllProducts(){
  var pm={},log=[];
  function lg(m){console.log(m);log.push(m)}

  // STEP 1: API productList
  lg('\n===== STEP 1: API productList =====');
  try{var r=await callAPI('productList',{});var pl=r.productList||[];pl.forEach(function(p){if(p.apiGame){p._source='api';pm[p.apiGame]=p}});lg('[API] Got '+pl.length+'. Unique: '+Object.keys(pm).length)}catch(e){lg('[API] Error: '+e.message)}

  // STEP 2: Scrape website - MLBB focused
  lg('\n===== STEP 2: Scrape smile.one (MLBB focused) =====');

  // MLBB uses /merchant/mobilelegends (no /game/) - try all country prefixes
  var mlbbPaths=[
    'merchant/mobilelegends',
    'ph/merchant/mobilelegends','id/merchant/mobilelegents',
    'my/merchant/mobilelegends','vn/merchant/mobilelegents',
    'th/merchant/mobilelegends','sg/merchant/mobilelegents',
    'ru/merchant/mobilelegends','kr/merchant/mobilelegents',
    'br/merchant/mobilelegends','us/merchant/mobilelegents',
    'mm/merchant/mobilelegends','pk/merchant/mobilelegents',
    'bd/merchant/mobilelegends','np/merchant/mobilelegents',
    'tr/merchant/mobilelegends','ae/merchant/mobilelegents',
    'sa/merchant/mobilelegends','mx/merchant/mobilelegents',
    'co/merchant/mobilelegends','pe/merchant/mobilelegents',
    'ar/merchant/mobilelegends','cl/merchant/mobilelegents',
  ];

  // HoK and other games use /{country}/merchant/game/{game}
  var otherGames=['hok','honorofkings','vikingrise','wherewindsmeet','genshinimpact','honkaistarrail','arenabreakout','pubgmobile','bigo','supersus','loveanddeepspace','ragnarokm','magicchessgogo','mobilelegendsadventure','watcherofrealms','shiningnikki','lovenikki','pathtonowhere','doomsdaylastsurvivors','lordsmobile','conquer','tinder'];
  var countries=['br','ph','id','my','vn','th','sg','ru','kr','us','mm','pk','bd','np','tr','ae','sa','mx','co','pe','ar','cl'];

  var allPaths=[];
  // Add MLBB paths
  mlbbPaths.forEach(function(p){allPaths.push(p)});
  // Add other game paths
  otherGames.forEach(function(g){countries.forEach(function(c){allPaths.push(c+'/merchant/game/'+g)})});

  lg('[SCRAPE] Trying '+allPaths.length+' pages...');

  var scrapedResults={};
  for(var i=0;i<allPaths.length;i++){
    var p=allPaths[i];
    try{
      var d=await scrapePage(CONFIG.WEBSITE+p);
      if(!d.error&&(d.payChannel||d.productId)){
        var key=d.payChannel||('_web_'+p.replace(/[\/]/g,'_'));
        scrapedResults[key]={data:d,path:p};
        if(d.payChannel){
          lg('[SCRAPE] '+p+' => pay_channel="'+d.payChannel+'" pid='+(d.productId||'')+' skus='+(d.skuIds?d.skuIds.length:0));
          if(!pm[d.payChannel]){
            pm[d.payChannel]={name:d.title||d.payChannel,apiGame:d.payChannel,type:'topup',subType:2,isMultiPurchase:false,_discovered:true,_source:'scrape',_productId:d.productId,_websiteSkus:d.websiteSkus,_country:d.country,_needsUserId:d.needsUserId,_needsServer:d.needsServer,_scrapeUrl:d.url};
          }else{pm[d.payChannel]._productId=d.productId;if(d.websiteSkus)pm[d.payChannel]._websiteSkus=d.websiteSkus}
        }else if(d.productId){
          lg('[SCRAPE] '+p+' => NO pay_channel, productid='+d.productId+' skus='+(d.skuIds?d.skuIds.length:0)+' title="'+d.title+'"');
          if(!pm[key]){
            pm[key]={name:d.title||p,apiGame:'',type:'topup',subType:2,isMultiPurchase:false,_discovered:true,_source:'website',_productId:d.productId,_websiteSkus:d.websiteSkus,_gameSlug:p,_country:d.country,_needsUserId:d.needsUserId,_needsServer:d.needsServer,_scrapeUrl:d.url};
          }
        }
      }
    }catch(e){}
  }

  lg('[SCRAPE] Found '+Object.keys(scrapedResults).length+' pages with product data');

  // STEP 3: Verify ALL products with skuList
  lg('\n===== STEP 3: Verify with skuList =====');
  var allKeys=Object.keys(pm),verified=0;
  for(var vi=0;vi<allKeys.length;vi++){
    var pk=allKeys[vi],prod=pm[pk];
    if(!prod.apiGame)continue;
    try{
      var sr=await callAPI('skuList',{apiGame:prod.apiGame});
      var skus=sr.skuList||[];
      if(skus.length>0){prod._verified=true;prod._skuCount=skus.length;verified++;lg('[VERIFY] "'+prod.apiGame+'" => '+skus.length+' SKUs VERIFIED')}
      else{prod._verified=false;prod._skuCount=0}
      if(sr.serverList)prod._hasServers=true;
    }catch(e){prod._verified=false;prod._verifyError=e.message}
  }
  lg('[VERIFY] '+verified+' products verified');

  // STEP 4: Try productid as apiGame
  lg('\n===== STEP 4: Try productid as apiGame =====');
  var triedPids={};
  Object.values(pm).forEach(function(p){if(p._productId&&!triedPids[p._productId]){triedPids[p._productId]=true}});
  var pidKeys=Object.keys(triedPids);
  for(var pi=0;pi<pidKeys.length;pi++){
    try{var psr=await callAPI('skuList',{apiGame:pidKeys[pi]});if(psr.skuList&&psr.skuList.length>0)lg('[PID] skuList apiGame="'+pidKeys[pi]+'" => '+psr.skuList.length+' SKUs FOUND!')}catch(e){}
    try{var psr2=await callAPI('skuList',{pid:pidKeys[pi]});if(psr2.skuList&&psr2.skuList.length>0)lg('[PID] skuList pid="'+pidKeys[pi]+'" => '+psr2.skuList.length+' SKUs FOUND!')}catch(e){}
  }

  // FINAL
  var allP=Object.values(pm);
  lg('\n===== COMPLETE: '+allP.length+' products =====');
  var v=allP.filter(function(p){return p._verified}).length;
  var s=allP.filter(function(p){return p._source==='scrape'}).length;
  var w=allP.filter(function(p){return p._source==='website'}).length;
  lg('  API: '+(allP.length-s-w)+' | Scraped: '+s+' | Website: '+w+' | Verified: '+v);
  for(var fi=0;fi<allP.length;fi++){var fp=allP[fi];var tags=[];if(fp._verified)tags.push('VERIFIED');if(fp._source==='scrape')tags.push('SCRAPED');if(fp._source==='website')tags.push('WEBSITE');if(fp._productId)tags.push('pid='+fp._productId);lg('  ['+fi+'] "'+fp.name+'" apiGame="'+fp.apiGame+'" '+tags.join(' '))}
  return{products:allP,log:log};
}

// ============ SERVER ============

var cached=null,dPromise=null;
var server=http.createServer(function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
  if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return}

  if(req.url==='/api/products'&&req.method==='GET'){
    if(cached){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({productList:cached.products}));return}
    if(!dPromise)dPromise=discoverAllProducts().then(function(r){cached=r;return r});
    dPromise.then(function(r){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({productList:r.products}))}).catch(function(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}))});return}

  if(req.url==='/api/log'&&req.method==='GET'){res.writeHead(200,{'Content':'application/json'});res.end(JSON.stringify({log:cached?cached.log:[],running:!!dPromise&&!cached}));return}

  if(req.url==='/api/refresh'&&req.method==='GET'){cached=null;dPromise=null;dPromise=discoverAllProducts().then(function(r){cached=r;return r});dPromise.then(function(r){res.writeHead(200,{'Content':'application/json'});res.end(JSON.stringify({productList:r.products,total:r.products.length}))}).catch(function(e){res.writeHead(500,{'Content':'application/json'});res.end(JSON.stringify({error:e.message}))});return}

  if(req.url.indexOf('/api/sku/')===0&&req.method==='GET'){var ag=decodeURIComponent(req.url.replace('/api/sku/',''));callAPI('skuList',{apiGame:ag}).then(function(r){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(r))}).catch(function(e){res.writeHead(500,{'Content':'application/json'});res.end(JSON.stringify({error:e.message}))});return}

  if(req.url.indexOf('/api/probe/')===0&&req.method==='GET'){var pg=decodeURIComponent(req.url.replace('/api/probe/',''));callAPI('skuList',{apiGame:pg}).then(function(r){var skus=r.skuList||[];res.writeHead(200,{'Content':'application/json'});res.end(JSON.stringify({apiGame:pg,found:skus.length>0,skuCount:skus.length,skus:skus.slice(0,5)}))}).catch(function(e){res.writeHead(200,{'Content':'application/json'});res.end(JSON.stringify({apiGame:pg,found:false,error:e.message}))});return}

  // NEW: Scrape any smile.one page and return full data including website SKUs
  if(req.url.indexOf('/api/webscrape/')===0&&req.method==='GET'){
    var sp=decodeURIComponent(req.url.replace('/api/webscrape/',''));
    scrapePage(CONFIG.WEBSITE+sp).then(function(data){res.writeHead(200,{'Content':'application/json'});res.end(JSON.stringify(data))}).catch(function(e){res.writeHead(500,{'Content':'application/json'});res.end(JSON.stringify({error:e.message}))});return}

  if(req.url==='/'||req.url==='/index.html'){try{var h=fs.readFileSync(path.join(__dirname,'index.html'),'utf-8');res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(h)}catch(e){res.writeHead(404);res.end('index.html not found')}return}
  res.writeHead(404);res.end('Not found');
});

server.listen(CONFIG.PORT,function(){console.log('\n  SmileCode Discovery http://localhost:'+CONFIG.PORT+'\n')});