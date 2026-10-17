import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, query, orderBy, limit, startAfter, getCountFromServer, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


let perPage = 10;
let currentCat = 'all';
let currentPage = 1;
let totalProductsCount = 0;
let lastVisible = null;
let pageCursors = {};



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
const rtdb = getDatabase(app);

const MY_WHATSAPP = "918618265898";
let products = [];
let filtered = [];


// Dukan close Band karne ke 
async function checkShopOpen(){
  try{
    const snap = await getDoc(doc(db, "settings", "shop"));
    if(snap.exists() && snap.data().open == false){
      document.getElementById("shopClosedBanner").style.display="flex";
    } else {
      document.getElementById("shopClosedBanner").style.display="none";
    }
  }catch(e){ console.log(e); }
}
checkShopOpen();






window.adjW = (id, delta, e, reset=false) => {
  if(e) e.stopPropagation();
  let p = filtered.find(x=>x.id===id) || products.find(x=>x.id===id);
  if(!p) return;
  if(!p._baseGram){
    p._baseGram = (parseFloat(p.qty)||1)*1000;
    p._basePrice = Number(p.price);
  }
  if(reset){ p._currGram = p._baseGram; }
  else { p._currGram = Math.max(100, (p._currGram || p._baseGram) + delta); }
  p.price = Math.round((p._basePrice / p._baseGram) * p._currGram);
  p.displayQty = p._currGram >= 1000? (p._currGram/1000).toFixed(p._currGram%1000==0?0:1)+'kg' : p._currGram+'g';
  
  // ye 2 line add kiya hai
  let _mm = JSON.parse(localStorage.getItem("sd_allMap")||"{}");
  _mm[p.id] = p;
  localStorage.setItem("sd_allMap", JSON.stringify(_mm));

  render(filtered);
  calc(); // total update ke liye
}



let cart = JSON.parse(localStorage.getItem("sd_cart")||"{}");





//  start CODE -back cart 0 
function clearFullCart(){
  cart = {};
  localStorage.removeItem("sd_cart");
  localStorage.removeItem("sd_allMap");
  if(typeof render === 'function' && typeof filtered !== 'undefined') render(filtered);
  if(typeof calc === 'function') calc();
}

// back hoga tab khali hoga
window.addEventListener('pagehide', clearFullCart);
window.addEventListener('beforeunload', clearFullCart);
//  CODE END back cart 0



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

    
    let baseCollection = collection(db, "products");
   let countQuery = baseCollection;
    let firstQ = null;

    if (currentCat!== 'all') {
     countQuery = query(baseCollection, where("cat", "==", currentCat));
    firstQ = query(baseCollection, where("cat", "==", currentCat), limit(perPage));
   } else {
      firstQ = query(baseCollection, orderBy("name"), limit(perPage));
    }

    const countSnap = await getCountFromServer(countQuery);
    totalProductsCount = countSnap.data().count;

    const snap = await getDocs(firstQ);

    products = snap.docs.map(d=>({id:d.id,...d.data()}));
   let _mm = JSON.parse(localStorage.getItem("sd_allMap")||"{}");
    products.forEach(p=> _mm[p.id]=p);
    localStorage.setItem("sd_allMap", JSON.stringify(_mm));

    lastVisible = snap.docs[snap.docs.length-1];
    pageCursors[2] = lastVisible;

    console.log("Loaded:", products.length, "Total:", totalProductsCount);
   if(products.length==0){
     document.getElementById("grid").innerHTML = "No products in Firebase - Add products first";
      return;
   }
    filtered = [...products];
   render(filtered);
   calc();
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
  let pageList = filtered;
let total = Math.ceil(totalProductsCount/perPage);
  let h="";
  
 
  pageList.forEach((p)=>{
    let realId = p.id;
    
    let isOut = p.available === 'no';
    
  let qty = cart[realId]||0;

    
 
 
 
let btn = isOut ? `<button disabled style="width:95px; min-width:95px; max-width:95px; height:28px; background:#ffe5e5; color:#d00; border:1.5px solid #d00; border-radius:8px; font-size:14px; font-weight:700; white-space:nowrap; display:flex; align-items:center; justify-content:center; padding:0;">Out of stock</button>`: qty==0? `<button class="addBtn" onclick="changeQ('${realId}',1)">+ Add</button>`: `<div class="qtyBox"><button onclick="changeQ('${realId}',-1)">-</button><span>${qty}</span><button onclick="changeQ('${realId}',1)">+</button></div>`;
 
 
  
  
    let isKg = p.qty && p.qty.toLowerCase().includes('kg');
    let weightBar = "";
    if(isKg){
      let show = p.displayQty || p.qty;
   weightBar = `<div style="display:flex;gap:2px;justify-content:center;align-items:center;height:26px;white-space:nowrap"><button onclick="adjW('${realId}',-100,event)" style="padding:2px 4px;font-size:8px;border:1px solid #bbb;border-radius:8px">-100g</button><button onclick="adjW('${realId}',-1000,event)" style="padding:2px 4px;font-size:8px;border:1px solid #bbb;border-radius:8px">-1kg</button><button onclick="adjW('${realId}',0,event,true)" style="padding:2px 5px;font-size:8px;border:1px solid #0e6a3c;border-radius:8px;background:#e8f5e9;font-weight:800">${show}</button><button onclick="adjW('${realId}',100,event)" style="padding:2px 4px;font-size:8px;border:1px solid #bbb;border-radius:8px">+100g</button><button onclick="adjW('${realId}',1000,event)" style="padding:2px 4px;font-size:8px;border:1px solid #bbb;border-radius:8px">+1kg</button></div>`;
    } else {
      weightBar = `<div style="height:26px"></div>`;
    }
   
 
h+=`<div class="card" style="display:flex;flex-direction:column;justify-content:space-between;height:270px"><div style="display:flex;flex-direction:column"><div style="height:120px;width:100%;background:#f0f2f5;border-radius:16px;display:flex;align-items:center;justify-content:center;overflow:hidden;">${p.img && !p.img.includes('placeholder') && !p.img.includes('via.') ? `<img loading="lazy" src="${p.img}" onclick="zoomImg('${p.img}')" style="height:120px;width:100%;object-fit:contain">` : ``}</div><h3 style="height:36px;overflow:hidden;margin:6px 0;font-size:14px;line-height:18px">${p.name}</h3>${weightBar}</div><div class="pricerow"><span class="price">₹${p.price}</span>${btn}</div></div>`;
 
  });
  
  
  
  document.getElementById("grid").innerHTML = h || "No products";
 
  if(total==0) total=1;
  

  let ph=`<button class="page-btn" onclick="window.goPrev()" ${window.currentPage==1?'disabled':''}>Prev</button>`;
let startPage = window.currentPage;
let endPage = Math.min(total, startPage + 2);
if(endPage - startPage < 2){ startPage = Math.max(1, endPage - 2); }
if(window.currentPage==1){ startPage=1; endPage=Math.min(3, total); }
for(let i=startPage; i<=endPage; i++){
  
  
  ph+=`<button class="page-btn ${i==window.currentPage?'active':''}" onclick="window.goPage(${i})">${i}</button>`;
}
ph+=`<button class="page-btn" onclick="window.goNext(${total})" ${window.currentPage==total?'disabled':''}>Next</button>`;
  

  document.querySelector(".pagination").innerHTML = ph;
}
window.render = render;



window.goPage=async(n)=>{
  window.currentPage=n; currentPage=n;
  let base = collection(db, "products");
  let q;
  if(currentCat=='all'){
    q = n==1? query(base, orderBy("name"), limit(perPage)) : query(base, orderBy("name"), startAfter(pageCursors[n]), limit(perPage));
  } else {
    q = n==1? query(base, where("cat","==",currentCat), limit(perPage)) : query(base, where("cat","==",currentCat), startAfter(pageCursors[n]), limit(perPage));
  }
  const snap = await getDocs(q);
  products = snap.docs.map(d=>({id:d.id,...d.data()}));
  let _mm = JSON.parse(localStorage.getItem("sd_allMap")||"{}");
  products.forEach(p=> _mm[p.id]=p);
  localStorage.setItem("sd_allMap", JSON.stringify(_mm));
  lastVisible = snap.docs[snap.docs.length-1];
  pageCursors[n+1]=lastVisible;
  filtered=[...products];
  render(filtered);
}



window.goNext=async(total)=>{
  if(window.currentPage<total){
    let base = collection(db, "products");
    let cursor = lastVisible || pageCursors[window.currentPage+1] || pageCursors[window.currentPage];
    if(!cursor) return;
    let q;
    if(currentCat=='all'){
      q = query(base, orderBy("name"), startAfter(cursor), limit(perPage));
    } else {
  q = query(base, where("cat","==",currentCat), startAfter(lastVisible), limit(perPage));
}
    const snap = await getDocs(q);
    if(snap.empty) return;
    window.currentPage++; 
    currentPage=window.currentPage;
    products = snap.docs.map(d=>({id:d.id,...d.data()}));
    let _mm = JSON.parse(localStorage.getItem("sd_allMap")||"{}");
    products.forEach(p=> _mm[p.id]=p);
    localStorage.setItem("sd_allMap", JSON.stringify(_mm));
    lastVisible = snap.docs[snap.docs.length-1];
    pageCursors[window.currentPage+1]=lastVisible;
    filtered=[...products];
    render(filtered);
  }
}





window.goPrev=async()=>{ if(window.currentPage>1) await window.goPage(window.currentPage-1); }


function getMsgLen(tempCart){
  let allMap = JSON.parse(localStorage.getItem("sd_allMap")||"{}");
  let cust = JSON.parse(localStorage.getItem("customer") || "{}");
  let name = cust.name || "Customer";
  let mobile = cust.phone || "8618265898";
  let village = cust.village || "BANDUA";
  let cleanWA = "918618265898";
  let dateTime = "14/10/2026, 10:46:00 pm";
  let clat = "22.6157583";
  let clng = "85.9343597";
  let dCharge = window._dCharge || 5;
  let dTime = window.deliveryFinalTime || "8:00am Tak";

  let msg = `*🛒 BANDUA CART ORDER*\n*Date: ${dateTime}*\nAdmin No: +${cleanWA}\n\n*Name- ${name}*\n*Mobile no- ${mobile}*\n*Village- ${village}*\n\n`;
  let grandTotal = 0;
  for(let id in tempCart){
    let p = allMap[id] || products.find(x=>x.id===id) || filtered.find(x=>x.id===id);
    if(!p) continue;
    let amt = p.price*tempCart[id];
    grandTotal += amt;
    msg += `🔹 *${p.name}* x ₹${p.price} x ${tempCart[id]} = ₹${amt}\n`;
  }
  msg += `\n*Total Item : ${Object.keys(tempCart).length}*\n*Total: ₹${grandTotal}*\n*Delivery: ₹${dCharge}*\n*Grand Total: ₹${grandTotal + dCharge}*\n*Delivery Time: ${dTime}*\n*THANKS 🙏*\n\n📍 Location: https://www.google.com/maps?q=${clat},${clng}`;
  return [...msg].length;
}


window.changeQ = (id, d) => {
  let q=(cart[id]||0)+d;

  if(q<=0) delete cart[id]; else cart[id]=q;
  localStorage.setItem("sd_cart",JSON.stringify(cart));
  render(filtered); calc();
}


 
 
 
 window.calc=()=>{
  let total=0;
  let allMap = JSON.parse(localStorage.getItem("sd_allMap")||"{}");
  for(let id in cart){
    let prod = (products.find(x=>x.id===id) || filtered.find(x=>x.id===id) || allMap[id]);
    if(prod){
      total+= Number(prod.price)*cart[id];
    }
  }
  let items = Object.keys(cart).length;

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

window.filterC = async (c, btn) => {
  document.querySelectorAll('.cats button').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  currentCat = c;
  window.currentPage = 1;
  currentPage = 1;
  lastVisible = null;
  pageCursors = {};

  let base = collection(db, "products");
  let countQ = c=='all'? base : query(base, where("cat","==",c));
  const countSnap = await getCountFromServer(countQ);
  totalProductsCount = countSnap.data().count;

  let q;
  if(c == 'all'){
    q = query(base, orderBy("name"), limit(perPage));
  } else {
    
    q = query(base, where("cat", "==", c), limit(perPage));
  }
  const snap = await getDocs(q);
  products = snap.docs.map(d=>({id:d.id,...d.data()}));
  lastVisible = snap.docs[snap.docs.length-1];
  pageCursors[2]=lastVisible;
  filtered = [...products];
  render(filtered);
}



//search start

let _allCache = null;
window.searchP = async () => {
  let q = document.getElementById("search").value.toLowerCase().trim();
  if(q==""){
    window.currentPage=1; 
    currentPage=1;
    await load(); 
    return;
  }
  if(!_allCache){
    const snap = await getDocs(collection(db, "products"));
    _allCache = snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  filtered = _allCache.filter(p => (p.name || "").toLowerCase().includes(q));
  totalProductsCount = filtered.length || 1;
 window.currentPage=1;
  currentPage=1;
  render(filtered);
}

// search end







const MY_UPI_ID = "subopradhan4@ybl";
const MY_SHOP_NAME = "Bandua Store";

window.viewC = () => {
  if (!_userDistance || _userDistance == 0) {
    alert("📍 Current Location ON kijye!\n' Agar exact Distance nahi mile to ghar se bahar aa ke ON'kijye");
    return;
  }
  calc();
  if (Object.keys(cart).length == 0) {
    window.orderWA_real();
    return;
  }
  let gt = (window._billTotal || 0) + (window._dCharge || 0);
  let maxKm = deliveryConfig.maxKm || 5;
  if (_userDistance > (maxKm * 1000)) {
    alert(`❌ Sorry! Hum sirf ${maxKm} KM tak delivery karte hain.\nAapki duri: ${(_userDistance/1000).toFixed(2)} KM hai.`);
    return;
  }
  let upiLink = `upi://pay?pa=${MY_UPI_ID}&pn=${encodeURIComponent(MY_SHOP_NAME)}&am=${gt}&cu=INR&tn=Order Payment`;
  window.location.href = upiLink;

}

  
  
  
  

window.MY_WHATSAPP = window.MY_WHATSAPP || "8618265898";




function addToCart(id){
  cart[id] = (cart[id]||0) + 1;
  let cust = JSON.parse(localStorage.getItem("customer") || "{}");
  let m = cust.phone || "guest";
  set(ref(rtdb, "carts/"+m), cart);
  localStorage.setItem("sd_cart", JSON.stringify(cart));
  render(filtered);
  calc();
}







   
window.order = async () => {
  if(!_userDistance){ alert("📍 Sorry! Current Location ON kijye"); return; }
  let maxKm = deliveryConfig.maxKm || 5;
  try{
    let snapMax = await getDoc(doc(db, "settings", "maxKm"));
    if(snapMax.exists()) maxKm = Number(snapMax.data().km);
    deliveryConfig.maxKm = maxKm;
  }catch(e){}
  if(_userDistance > (maxKm * 1000)){
    alert(`❌ Sorry! Delivery sirf ${maxKm} KM tak hai.\nAap ${( _userDistance/1000).toFixed(2)} KM dur ho.`);
    return;
  }
  calc();
  let cust = JSON.parse(localStorage.getItem("customer") || "{}");
  let name = cust.name || "Customer";
  let mobile = cust.phone || "";
  let village = cust.village || "BANDUA";
  if(!mobile || mobile.length < 10){
    mobile = prompt("Mobile Number likhiye:", "");
    if(!mobile || mobile.length < 10) return;
    cust.phone = mobile;
    localStorage.setItem("customer", JSON.stringify(cust));
  }
  let cleanWA = (window.MY_WHATSAPP+"").replace(/\D/g,'');
  if(cleanWA.length == 10) cleanWA = "91" + cleanWA;
  let allMap = JSON.parse(localStorage.getItem("sd_allMap")||"{}");
  let allItems = [];
  for(let id in cart){ let p = allMap[id] || products.find(x=>x.id===id); if(p) allItems.push(p); }
  if(!allItems.length){ alert("Sorry! Pahle item add kijiye"); return; }

  let dateTime = new Date().toLocaleString('en-IN');
  let clat = localStorage.getItem('custLat') || 0;
  let clng = localStorage.getItem('custLng') || 0;

  let msg = `*🛒 BANDUA CART ORDER*\n*Date: ${dateTime}*\n📞 Admin No: +${cleanWA}\n\n*Name- ${name}*\n*Mobile no- ${mobile}*\n*Village- ${village}*\n\n`;
  let grandTotal = 0;
  allItems.forEach(p=>{
    let amt = p.price*cart[p.id];
    grandTotal += amt;
    msg += `🔹 *${p.name}* x ₹${p.price} x ${cart[p.id]} = ₹${amt}\n`;
  });
  msg += `\n*Total Item : ${Object.keys(cart).length}*\n*Total: ₹${grandTotal}*\n*Delivery: ₹${window._dCharge}*\n*Grand Total: ₹${grandTotal + (window._dCharge||0)}*\n*Delivery Time: ${window.deliveryFinalTime}*\n*THANKS 🙏*\n\n📍 Location: https://www.google.com/maps?q=${clat},${clng}`;

  
    // --- BC01, BC02 wala sequential ID ---
  let orderId = 'BC01';
  try{
    let counterRef = doc(db, "settings", "orderCounter");
    let counterSnap = await getDoc(counterRef);
    let nextNum = 1;
    if(counterSnap.exists()){
      nextNum = (Number(counterSnap.data().count) || 0) + 1;
    }
    orderId = 'BC' + String(nextNum).padStart(2, '0');
    await setDoc(counterRef, {count: nextNum}, {merge:true});
  }catch(e){
    console.log("Counter error, fallback ID", e);
    orderId = 'BC' + Date.now().toString().slice(-4);
  }
  
  
  
  
  let orderData = {
    orderId: orderId,
    cart: cart,
    allMap: allMap,
    msg: msg,
    total: grandTotal,
    dCharge: window._dCharge||0,
    grand: grandTotal + (window._dCharge||0),
    customer: cust,
    name: name, mobile: mobile, village: village,
    lat: clat, lng: clng,
    dist: _userDistance,
    deliveryTime: window.deliveryFinalTime,
    time: dateTime,
    createdAt: new Date(),
    status: 'new'
  };
  try{ await addDoc(collection(db, "orders"), orderData); }catch(e){}
  localStorage.setItem('lastOrder', JSON.stringify(orderData));




// --- khatam ---




  // cart clear pehle
  let mobileForClear = mobile;
  cart={};
  set(ref(rtdb, "carts/"+mobileForClear), {});
  localStorage.removeItem("sd_cart");
  render(filtered);
  calc();

  window.location.href = 'bill.html?id=' + orderId;
}
   
   




window.zoomImg = (src)=>{
  document.getElementById("zoomedImg").src = src;
  document.getElementById("imgZoomModal").style.display="flex";
}
window.closeZoom = ()=>{
  document.getElementById("imgZoomModal").style.display="none";
}
load();

// srart Admin se Delivery Time control


window.deliveryFinalTime="6:00pm";
(async()=>{
  const snap = await getDoc(doc(db,"settings","delivery"));
  if(snap.exists()){
    let t = snap.data().deliveryTime;
    if(t){
      window.deliveryFinalTime=t;
      document.getElementById("deliveryLoc").innerText="🚚 Delivery: "+t;
      document.getElementById("deliveryLoc").style.fontWeight="900";
    }
  }
})();

// end

