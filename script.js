
// Ye dono line bilkul pehli line me honi chahiye
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; 



let perPage = 10;
window.currentPage = 1;
let currentPage = window.currentPage;


const firebaseConfig = {
  apiKey: "AIzaSyBRZ86_UnSvgPBEImKCr1D4gDyZISvlf0U",
  authDomain: "subodh-dukan.firebaseapp.com",
  projectId: "subodh-dukan",
  storageBucket: "subodh-dukan.firebasestorage.app",
  messagingSenderId: "368451643879",
  appId: "1:368451643879:web:ee91ef9d797b480bd4b542"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MY_WHATSAPP = "918618265898";
let products = [];
let filtered = [];


window.adjW = (idx, delta, e, reset=false) => {
  if(e) e.stopPropagation();
  let p = products[idx];
  if(!p) return;
  if(!p._baseGram){
    p._baseGram = (parseFloat(p.qty)||1)*1000;
    p._basePrice = Number(p.price);
  }
  if(reset){ p._currGram = p._baseGram; }
  else { p._currGram = Math.max(100, (p._currGram || p._baseGram) + delta); }
  p.price = Math.round((p._basePrice / p._baseGram) * p._currGram);
  p.displayQty = p._currGram >= 1000? (p._currGram/1000).toFixed(p._currGram%1000==0?0:1)+'kg' : p._currGram+'g';
  render(filtered);
}




let cart = JSON.parse(localStorage.getItem("sd_cart")||"{}");

let deliveryConfig = { base: 5, perMeter: 0.005, shopLat: 22.615441, shopLng: 85.934529, maxKm: 5 };
let _userDistance = 0;
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

window.getLocation=()=>{
 let i=document.getElementById("locInfo"), s=document.getElementById("locStatus");
 if(i) i.innerText="📡 Location le rahe hain...";
 navigator.geolocation.getCurrentPosition(p=>{
  let la=p.coords.latitude, ln=p.coords.longitude;
  let d=calcDistance(22.615441,85.934529,la,ln);
  _userDistance=d;
  
  window._userDistance=d;
  
  localStorage.setItem('custDist',d);
  localStorage.setItem('custLat',la);
  localStorage.setItem('custLng',ln);
  let dc=Math.round(deliveryConfig.base + deliveryConfig.perMeter*d);
  window._dCharge=dc;
  calc();
  if(i) i.innerText=""; 
  if(s) s.innerText=`✅ Distance: ${Math.round(d)}mtr | ₹${dc}`;
 },e=>{
  if(i) i.innerText=e.code==1?"❌ Allow karo":"❌ GPS ON karo";
 },{enableHighAccuracy:true,timeout:20000,maximumAge:0});
}



async function load(){
  try{
    try{
      const snapSet = await getDoc(doc(db, "settings", "delivery"));
if(snapSet.exists()){
  let d = snapSet.data();
  if(d.perMeter) d.perMeter = parseFloat(d.perMeter);
  if(d.base) d.base = parseFloat(d.base);
  deliveryConfig = {...deliveryConfig,...d};
}
    }catch(e){}

    try{
      const snapMax = await getDoc(doc(db, "settings", "maxKm"));
      if(snapMax.exists()){
        deliveryConfig.maxKm = snapMax.data().km;
      }
    }catch(e){}


    const snap = await getDocs(collection(db, "products"));
    products = snap.docs.map(d=>d.data());
    console.log("Loaded:", products.length);
    if(products.length==0){
      document.getElementById("grid").innerHTML = "No products in Firebase - Add products first";
      return;
    }
    filtered = [...products];
    render(filtered);
    calc();
    
    
    
    //setTimeout(()=>{ getLocation(); }, 500);
    
    
    applyCatVisibility();
  }catch(e){
    console.error(e);
    document.getElementById("grid").innerHTML = "Error: "+e.message;
  }
}

function render(list){
  if(!list) list = filtered;
  filtered = list;
  window.currentPage = window.currentPage || 1;
  currentPage = window.currentPage;
  let start = (currentPage-1)*perPage;
  let end = start + perPage;
  let pageList = filtered.slice(start, end);
  let h="";
  
 
 
 
 
  pageList.forEach((p)=>{
    let realIdx = products.indexOf(p);
    
    let isOut = p.available === 'no';
    
    let qty = cart[realIdx]||0;
let btn = isOut? `<button disabled style="background:#888;color:white;padding:6px 8px;border-radius:8px;font-size:13px;font-weight:700">Out of stock</button>`: qty==0? `<button class="addBtn" onclick="changeQ(${realIdx},1)">+ Add</button>` : `<div class="qtyBox"><button onclick="changeQ(${realIdx},-1)">-</button><span>${qty}</span><button onclick="changeQ(${realIdx},1)">+</button></div>`;
    
    
  
    let isKg = p.qty && p.qty.toLowerCase().includes('kg');
    let weightBar = "";
    if(isKg){
      let show = p.displayQty || p.qty;
      weightBar = `<div style="display:flex;gap:2px;justify-content:center;align-items:center;height:26px;white-space:nowrap"><button onclick="adjW(${realIdx},-100,event)" style="padding:2px 4px;font-size:8px;border:1px solid #bbb;border-radius:8px">-100g</button><button onclick="adjW(${realIdx},-1000,event)" style="padding:2px 4px;font-size:8px;border:1px solid #bbb;border-radius:8px">-1kg</button><button onclick="adjW(${realIdx},0,event,true)" style="padding:2px 5px;font-size:8px;border:1px solid #0e6a3c;border-radius:8px;background:#e8f5e9;font-weight:800">${show}</button><button onclick="adjW(${realIdx},100,event)" style="padding:2px 4px;font-size:8px;border:1px solid #bbb;border-radius:8px">+100g</button><button onclick="adjW(${realIdx},1000,event)" style="padding:2px 4px;font-size:8px;border:1px solid #bbb;border-radius:8px">+1kg</button></div>`;
    } else {
      weightBar = `<div style="height:26px"></div>`;
    }
    h+=`<div class="card" style="display:flex;flex-direction:column;justify-content:space-between;height:270px"><div style="display:flex;flex-direction:column"><img loading="lazy" src="${p.img}" onclick="zoomImg('${p.img}')" style="height:120px;width:100%;object-fit:contain"><h3 style="height:36px;overflow:hidden;margin:6px 0;font-size:14px;line-height:18px">${p.name}</h3>${weightBar}</div><div class="pricerow"><span class="price">₹${p.price}</span>${btn}</div></div>`;
  });
  


  document.getElementById("grid").innerHTML = h || "No products";
  let total = Math.ceil(filtered.length/perPage);
  if(total==0) total=1;
  
  let ph=`<button class="page-btn" onclick="window.goPrev()" ${window.currentPage==1?'disabled':''}>Prev</button>`;
let startPage = Math.max(1, window.currentPage - 1);
let endPage = Math.min(total, startPage + 2);
if(endPage - startPage < 2){ startPage = Math.max(1, endPage - 2); }
for(let i=startPage; i<=endPage; i++){
  ph+=`<button class="page-btn ${i==window.currentPage?'active':''}" onclick="window.goPage(${i})">${i}</button>`;
}
ph+=`<button class="page-btn" onclick="window.goNext(${total})" ${window.currentPage==total?'disabled':''}>Next</button>`;
  
  
  
  

  document.querySelector(".pagination").innerHTML = ph;
}
window.render = render;
window.goPage=(n)=>{ window.currentPage=n; currentPage=n; window.render(); window.scrollTo(0,0); }
window.goNext=(total)=>{ if(window.currentPage<total){ window.currentPage++; currentPage=window.currentPage; window.render(); window.scrollTo(0,0);} }
window.goPrev=()=>{ if(window.currentPage>1){ window.currentPage--; currentPage=window.currentPage; window.render(); window.scrollTo(0,0);} }







window.changeQ=(i,d)=>{
  let q=(cart[i]||0)+d;
  if(q<=0) delete cart[i]; else cart[i]=q;
  localStorage.setItem("sd_cart",JSON.stringify(cart));
  render(filtered); calc();
}

window.calc=()=>{
  let total=0, items=0;
  for(let i in cart){
    if(products[i]){
      total+= Number(products[i].price)*cart[i];
      items+=cart[i];
    }
  }
  let dCharge = 0;
  if(_userDistance > 0){
    dCharge = deliveryConfig.base + (deliveryConfig.perMeter * _userDistance);
    dCharge = Math.round(dCharge);
    if(dCharge < deliveryConfig.base) dCharge = deliveryConfig.base;
  } else {
    dCharge = window._dCharge || 0;
  }
  window._billTotal = total;
  window._dCharge = dCharge;
  window._dist = _userDistance;

  if(items==0){
    if(dCharge > 0){
      document.getElementById("tot").innerHTML=`Total ₹0<br><small>Delivery ${dCharge} | Add item</small>`;
    } else {
      document.getElementById("tot").innerHTML=`Total ₹0<br><small>0 items</small>`;
    }
  } else {
    let gt = total + dCharge;
    document.getElementById("tot").innerHTML=`Total ₹${gt}<br><small>${total}+Delivery ${dCharge}</small>`;
  }
  document.getElementById("cnt").innerText=items+" items";
}

// Category ON/OFF 
async function applyCatVisibility(){
const CATS = ['worship','grocery','beauty','stationary','cleaning','electrical'];
  for(let c of CATS){
    try{
      let snap = await getDoc(doc(db, "settings", "cat_"+c));
      let active = snap.exists()? snap.data().active : true;
      if(!active){
        document.querySelectorAll(`.cats button`).forEach(btn=>{
          if(btn.getAttribute('onclick')?.includes(`'${c}'`)){
            btn.style.display = 'none';
          }
        });
      }
    }catch(e){}
  }
} 






window.filterC=(c,btn)=>{
  document.querySelectorAll('.cats button').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(c=='all') filtered=[...products];
  else filtered=products.filter(p=> (p.cat||'').toLowerCase().includes(c.toLowerCase()));
  window.currentPage=1;
  currentPage=1;
  render(filtered);
}

window.searchP=()=>{
  let q=document.getElementById("search").value.toLowerCase();
  filtered = products.filter(p=>p.name.toLowerCase().includes(q));
  window.currentPage=1;
  currentPage=1;
  render(filtered);
}
const MY_UPI_ID = "subopradhan4@ybl";
const MY_SHOP_NAME = "Bandua Store";

window.viewC = () => {
  let dist = window._userDistance || _userDistance || parseFloat(localStorage.getItem('custDist')) || 0;
  if (!dist || dist == 0) {
    alert("📍 Pehle Location ON kijye!\nAgar exact Distance nahi mile to ghar se bahar aa ke ON'kijye");
    return;
  }
  calc();
  if (Object.keys(cart).length == 0) {
    window.orderWA_real();
    return;
  }
  let gt = (window._billTotal || 0) + (window._dCharge || 0);
  let maxKm = deliveryConfig.maxKm || 5;
  if (dist > (maxKm * 1000)) {
    alert(`❌ Sorry! Hum sirf ${maxKm} KM tak delivery karte hain.\nAapki duri: ${(dist/1000).toFixed(2)} KM hai.`);
    return;
  }
  if(gt <= 0) gt = 1;
  let upi = `upi://pay?pa=${MY_UPI_ID}&pn=${encodeURIComponent(MY_SHOP_NAME)}&am=${gt}&cu=INR&tn=${encodeURIComponent('Bandua Cart Order')}`;
  window.location.href = upi;
}
  


window.orderWA_real = () => {
  if(!_userDistance || _userDistance == 0){
    alert("📍 Pehle Location ON kijye!\nAgar exact Distance nahi mile to ghar se bahar aa ke ON'kijye");
    return;
  }
  let maxKm = deliveryConfig.maxKm || 5;
  if(_userDistance > (maxKm * 1000)){
    alert(`❌ Sorry! Hum sirf ${maxKm} KM tak delivery karte hain.\nAapki duri: ${(_userDistance/1000).toFixed(2)} KM hai.`);
    return;
  }
  calc();
  let cust = JSON.parse(localStorage.getItem("customer") || "{}");
  let name = cust.name || localStorage.getItem("sd_name") || localStorage.getItem("bandua_name") || "Customer";
  let mobile = cust.phone || localStorage.getItem("sd_phone") || localStorage.getItem("bandua_mobile") || "";
  let village = cust.village || localStorage.getItem("sd_add") || localStorage.getItem("bandua_village") || "";
  let dateTime = new Date().toLocaleString('hi-IN');
  let msg = "";

 if(Object.keys(cart).length==0){
    let deliveryCharge = window._dCharge || 0;
    let grandTotal = deliveryCharge; 
    // photo order me saman ka bill 0, to grand total = delivery hi

msg = `*📸 Photo/List Order - Bandua Cart*%0A*Date: ${dateTime}*%0A📞 Admin No: %2B918618265898%0A%0A*Name- ${name}*%0A*Mobile no- ${mobile}*%0A*Village- ${village}*%0A%0A*Mujhe ye saman chahiye, main photo bhej raha hu* 👇%0A%0A*Delivery: ₹${deliveryCharge}*%0A*Grand Total: ₹${grandTotal}*%0A%0A📍 Location: https://www.google.com/maps?q=${localStorage.getItem('custLat')},${localStorage.getItem('custLng')}`;
   
   
 } else {
msg = `*🛒 Bandua Cart Order*%0A*Date: ${dateTime}*%0A📞 Admin No: %2B918618265898%0A%0A*Name- ${name}*%0A*Mobile no- ${mobile}*%0A*Village- ${village}*%0A%0A`;


    for(let i in cart){
      if(products[i]){
        let qShow = products[i].displayQty || products[i].qty;
        if(qShow && qShow.toLowerCase() === 'kg') qShow = '1kg';
        if(qShow && qShow.toLowerCase() === 'nos') qShow = '1 Nos';
        if(qShow && qShow.toLowerCase() === 'pkt') qShow = '1 Pkt';
        if(qShow && qShow.toLowerCase() === 'mtr') qShow = '1 Mtr';
        let cleanName = products[i].name.replace(/\b\d+\s*(ml|g|gm|kg|pc|pcs|piece|mtr|ltr)\b|\b\d+\b|\b(kg|g|gm|ml|nos|pkt|packet|pcs|pc|piece|mtr|meter|metre|ltr|litre)\b/gi,'').replace(/\s+/g,' ').trim();
       
       msg+= `•%C2%A0${cleanName}%C2%A0${qShow}%C2%A0x%C2%A0₹${products[i].price}%C2%A0x%C2%A0${cart[i]}%C2%A0=%C2%A0₹${products[i].price*cart[i]}%0A`;
       
       
      }
    }
        let gt = (window._billTotal||0) + (window._dCharge||0);
    let clat = localStorage.getItem('custLat') || 0;
    let clng = localStorage.getItem('custLng') || 0;
    msg+= `%0A*Total: ₹${window._billTotal}*%0A*Delivery: ₹${window._dCharge}*%0A*Grand Total: ₹${gt}*%0A%0A📍 Location: https://www.google.com/maps?q=${clat},${clng}`;
  }
  window.open(`https://wa.me/${MY_WHATSAPP}?text=${msg}`,"_blank");
}
window.orderWA = window.orderWA_real;
window.order = window.orderWA_real;

window.zoomImg = (src)=>{
  document.getElementById("zoomedImg").src = src;
  document.getElementById("imgZoomModal").style.display="flex";
}
window.closeZoom = ()=>{
  document.getElementById("imgZoomModal").style.display="none";
}
load();

// Admin se Delivery Time control - FINAL FIX
(async()=>{
  try{
    const snap = await getDoc(doc(db,"settings","delivery"));
    if(snap.exists()){
      let data = snap.data();
      let t = data.deliveryTime || data.time || data.delivery_time;
      let el = document.getElementById("deliveryLoc");
      if(el && t){
        el.innerText = "🚚 Delivery: " + t;
      }
    }
  }catch(e){
    console.log(e);
  }
})();

