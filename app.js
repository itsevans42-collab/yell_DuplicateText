(() => {
const $ = id => document.getElementById(id);
const canvas=$("canvas"), ctx=canvas.getContext("2d");
let bg=null, bgURL=null, elements=[], baseElements=[], pageOverrides={}, activeEditScope="all", selected=-1, tool="Nama", zoom=1, rows=[], headers=[], nameKey="", numberKey="", history=[], future=[], dragging=null, offset={x:0,y:0};
const customFonts = new Map();
const placeholderSample={nama:"Contoh Teks",nomor:"SRT-001",tanggal:new Date().toLocaleDateString("id-ID"),kegiatan:"Nama Kegiatan"};
function cloneElements(value=elements){return JSON.parse(JSON.stringify(value))}
function editTargets(){
 const scope=activeEditScope;
 if(scope==="current")return rows.length?[previewIndex]:[];
 if(scope==="range"){
  const a=Number($("editStart").value),b=Number($("editEnd").value);
  if(!rows.length||!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<a||b>rows.length)return [];
  return Array.from({length:b-a+1},(_,i)=>a-1+i);
 }
 return rows.map((_,i)=>i);
}
function commitScopedEdits(){
 const scope=activeEditScope;
 if(scope==="all"||!rows.length){baseElements=cloneElements();if(scope==="all")pageOverrides={};return}
 const targets=editTargets();
 targets.forEach(i=>{pageOverrides[i]=cloneElements()});
}
function loadElementsForPage(){
 elements=cloneElements(rows.length?(pageOverrides[previewIndex]||baseElements):baseElements.length?baseElements:elements);
 selected=-1;listElements();updateProps();
}
function snapshot(){history.push(JSON.stringify({elements,bgURL}));if(history.length>50)history.shift();future=[]}
function refreshFontOptions(){
 const select=$("pFont"), current=select.value;
 for(const [name] of customFonts){if(![...select.options].some(o=>o.value===name)){const opt=document.createElement("option");opt.value=name;opt.textContent=name+" (tambahan)";select.appendChild(opt)}}
 if([...select.options].some(o=>o.value===current))select.value=current;
}
function updateRangeControls(){
 const start=$("rangeStart"), end=$("rangeEnd"), hint=$("rangeHint");
 const total=rows.length;
 start.max=String(Math.max(total,1)); end.max=String(Math.max(total,1));
 if(total && (!start.value || Number(start.value)<1))start.value="1";
 if(total && (!end.value || Number(end.value)<1 || Number(end.value)>total))end.value=String(total);
 if(!total){start.value="1";end.value="1";hint.textContent="Unggah file peserta untuk memilih rentang nama."}
 else{hint.textContent=`Ada ${total} peserta. Pilih nomor 1–${total}, misalnya 3 sampai 10.`}
}
function getExportRows(){
 const total=rows.length, start=Number($("rangeStart").value), end=Number($("rangeEnd").value);
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>total){
  throw Error(`Rentang tidak valid. Masukkan nomor dari 1 sampai ${total}, dan pastikan nomor awal tidak lebih besar dari nomor akhir.`);
 }
 return rows.slice(start-1,end).map((row,index)=>({row,index:start-1+index}));
}
function textFor(el,row=null){let t=el.text||"";const data=row||placeholderSample;return t.replace(/\{([^}]+)\}/g,(_,key)=>{if(key.startsWith("kolom:"))key=key.slice(6);if(key==="nama")return data[nameKey]??data.nama??"";if(key==="nomor")return data[numberKey]??data.nomor??"";return data[key]??""})}
function draw(row=null){
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
 if(bg)ctx.drawImage(bg,0,0,canvas.width,canvas.height);
 elements.forEach((el,i)=>{ctx.save();ctx.strokeStyle=el.color||"#20243a";ctx.fillStyle=el.color||"#20243a";ctx.lineWidth=el.size||3;
 if(el.type==="Garis"){ctx.beginPath();ctx.moveTo(el.x,el.y);ctx.lineTo(el.x2??el.x+160,el.y2??el.y);ctx.stroke()}
 else if(el.type==="Kotak"){ctx.strokeRect(el.x-75,el.y-35,150,70)}
 else if(el.type==="Lingkaran"){ctx.beginPath();ctx.arc(el.x,el.y,45,0,Math.PI*2);ctx.stroke()}
 else{ctx.font=`${el.weight||"normal"} ${el.size||42}px ${el.font||"Arial"}`;ctx.textAlign=el.align||"center";ctx.textBaseline="middle";ctx.fillText(textFor(el,row),el.x,el.y)}
 if(i===selected){ctx.setLineDash([6,4]);ctx.strokeStyle="#6558d9";ctx.lineWidth=2;ctx.strokeRect(el.x-90,el.y-35,180,70)}
 ctx.restore()});
 $("empty").hidden=!!bg;
}
function listElements(){const box=$("elements");box.innerHTML="";if(!elements.length){box.innerHTML='<p class="hint">Belum ada elemen.</p>';return}elements.forEach((e,i)=>{const d=document.createElement("div");d.className="elrow"+(i===selected?" selected":"");const label=e.type==="Garis"||e.type==="Kotak"||e.type==="Lingkaran"?e.type:(e.text||e.type);d.innerHTML=`<span>✦</span><span class="elname"></span><button class="delx" title="Hapus">×</button>`;d.querySelector(".elname").textContent=label;d.onclick=()=>selectElement(i);d.querySelector("button").onclick=ev=>{ev.stopPropagation();snapshot();elements.splice(i,1);commitScopedEdits();if(selected===i)selected=-1;else if(selected>i)selected--;listElements();updateProps();draw()};box.appendChild(d)})}
function selectElement(i){selected=i;listElements();updateProps();draw(currentRow())}
function updateProps(){const has=selected>=0&&elements[selected];$("props").hidden=!has;$("noSelection").hidden=!!has;if(!has)return;let e=elements[selected];$("typeLabel").textContent=e.type;$("pText").value=e.text||"";$("pX").value=e.x;$("pY").value=e.y;$("pSize").value=e.size||3;$("sizeLabel").textContent=(e.size||3)+" px";$("pFont").value=e.font||"Arial";$("pColor").value=e.color||"#20243a";$("pAlign").value=e.align||"center"}
function currentRow(){return rows.length?rows[previewIndex]||rows[0]:null}
let previewIndex=0;
function updatePreview(){if(rows.length){loadElementsForPage();const r=rows[previewIndex];$("personCount").textContent=`Halaman ${previewIndex+1} / ${rows.length}`;$("previewText").textContent=`${r[nameKey]??""}${numberKey&&r[numberKey]!==undefined?" · "+r[numberKey]:""}`;}else{$("personCount").textContent="Contoh";$("previewText").textContent="Contoh Nama Peserta"}draw(currentRow())}
function addElement(){snapshot();let type=tool,text=$("newText").value;if(type==="Nama"&&!text)text="{nama}";if(type==="Angka"&&!text)text="{nomor}";let e={type,text,x:canvas.width/2,y:canvas.height/2,size:type==="Garis"?4:42,color:"#20243a",font:"Arial",align:"center",x2:canvas.width/2+160,y2:canvas.height/2};elements.push(e);commitScopedEdits();selectElement(elements.length-1)}
document.querySelectorAll(".tools button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tools button").forEach(x=>x.classList.remove("chosen"));b.classList.add("chosen");tool=b.dataset.type;$("newText").value=tool==="Nama"?"{nama}":tool==="Angka"?"{nomor}":tool==="Teks"?"Teks baru":""});
$("addElement").onclick=addElement;
$("pickBg").onclick=()=>$("bgFile").click();
$("bgFile").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.type==="application/pdf"){if(!window.pdfjsLib)throw Error("PDF.js belum termuat. Periksa koneksi internet lalu muat ulang.");pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;const page=await pdf.getPage(1);const vp=page.getViewport({scale:1.5});const c=document.createElement("canvas");c.width=vp.width;c.height=vp.height;await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;bg=await createImageBitmap(await new Promise(res=>c.toBlob(res)));}else bg=await createImageBitmap(file);canvas.width=bg.width;canvas.height=bg.height;$("dimensions").textContent=`Ukuran kanvas: ${canvas.width} × ${canvas.height}`;snapshot();draw();}catch(err){alert("Desain tidak bisa dibuka: "+err.message)}e.target.value=""};
["pText","pX","pY","pSize","pFont","pColor","pAlign"].forEach(id=>$(id).addEventListener("input",()=>{if(selected<0)return;const e=elements[selected];if(id==="pText")e.text=$("pText").value;if(id==="pX")e.x=Number($("pX").value);if(id==="pY")e.y=Number($("pY").value);if(id==="pSize")e.size=Number($("pSize").value);if(id==="pFont")e.font=$("pFont").value;if(id==="pColor")e.color=$("pColor").value;if(id==="pAlign")e.align=$("pAlign").value;commitScopedEdits();$("sizeLabel").textContent=e.size+" px";listElements();draw(currentRow());updatePreview()}));
$("delete").onclick=()=>{if(selected<0)return;snapshot();elements.splice(selected,1);commitScopedEdits();selected=-1;listElements();updateProps();draw(currentRow())};
$("duplicate").onclick=()=>{if(selected<0)return;snapshot();const copy={...elements[selected],x:elements[selected].x+25,y:elements[selected].y+25};elements.push(copy);commitScopedEdits();selectElement(elements.length-1)};
canvas.addEventListener("pointerdown",e=>{if(!bg)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;let found=-1;for(let i=elements.length-1;i>=0;i--){const el=elements[i];if(Math.abs(x-el.x)<100&&Math.abs(y-el.y)<45){found=i;break}}if(found>=0){selectElement(found);dragging=found;offset={x:x-elements[found].x,y:y-elements[found].y};canvas.setPointerCapture(e.pointerId)}});
canvas.addEventListener("pointermove",e=>{if(dragging===null)return;const r=canvas.getBoundingClientRect();elements[dragging].x=Math.round((e.clientX-r.left)*canvas.width/r.width-offset.x);elements[dragging].y=Math.round((e.clientY-r.top)*canvas.height/r.height-offset.y);$("pX").value=elements[dragging].x;$("pY").value=elements[dragging].y;draw(currentRow())});
canvas.addEventListener("pointerup",()=>{if(dragging!==null){dragging=null;commitScopedEdits();listElements();updateProps()}});
$("zoomIn").onclick=()=>{zoom=Math.min(2,zoom+.1);canvas.style.width=(zoom*100)+"%";$("zoomLabel").textContent=Math.round(zoom*100)+"%"};$("zoomOut").onclick=()=>{zoom=Math.max(.4,zoom-.1);canvas.style.width=(zoom*100)+"%";$("zoomLabel").textContent=Math.round(zoom*100)+"%"};$("fit").onclick=()=>{zoom=1;canvas.style.width="100%";$("zoomLabel").textContent="100%"};
$("prev").onclick=()=>{if(rows.length){commitScopedEdits();previewIndex=(previewIndex-1+rows.length)%rows.length;updatePreview()}};$("next").onclick=()=>{if(rows.length){commitScopedEdits();previewIndex=(previewIndex+1)%rows.length;updatePreview()}};
function updateEditScopeUI(){const mode=$("editScope").value;$("editRangeFields").hidden=mode!=="range";const total=rows.length;$("editStart").max=String(Math.max(1,total));$("editEnd").max=String(Math.max(1,total));if(total){if(Number($("editStart").value)<1)$("editStart").value="1";if(Number($("editEnd").value)<1||Number($("editEnd").value)>total)$("editEnd").value=String(total)}const hints={all:"Perubahan diterapkan ke semua halaman sekaligus.",current:`Perubahan hanya diterapkan ke halaman ${previewIndex+1}.`,range:"Perubahan diterapkan ke setiap halaman dalam rentang yang kamu tentukan."};$("editScopeHint").textContent=hints[mode];}
$("editScope").addEventListener("change",()=>{commitScopedEdits();const mode=$("editScope").value;activeEditScope=mode;if(mode==="all"){elements=cloneElements(baseElements);pageOverrides={}}else{elements=cloneElements(pageOverrides[previewIndex]||baseElements)}selected=-1;listElements();updateProps();updateEditScopeUI();draw(currentRow())});
["editStart","editEnd"].forEach(id=>$(id).addEventListener("change",()=>{const total=rows.length;if(!total)return;let a=Math.max(1,Math.min(total,Number($("editStart").value)||1)),b=Math.max(1,Math.min(total,Number($("editEnd").value)||total));if(a>b){if(id==="editStart")b=a;else a=b}$("editStart").value=String(a);$("editEnd").value=String(b);updateEditScopeUI()}));
function setRows(data){if(!rows.length)baseElements=cloneElements();else commitScopedEdits();headers=data.length?Object.keys(data[0]):[];rows=data.filter(r=>Object.values(r).some(v=>String(v??"").trim()!==""));$("mapping").hidden=!rows.length;$("excelStatus").textContent=rows.length?`${rows.length} halaman terbaca.`:"Tidak ada data peserta yang ditemukan.";if(!rows.length)return;pageOverrides={};baseElements=cloneElements(elements);const options=headers.map(h=>`<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join("");$("nameCol").innerHTML=options;$("numberCol").innerHTML='<option value="">— Tidak ada —</option>'+options;nameKey=headers.find(h=>/nama|name|peserta/i.test(h))||headers[0];numberKey=headers.find(h=>/nomor|no\.?|number|kode/i.test(h)&&h!==nameKey)||"";$("nameCol").value=nameKey;$("numberCol").value=numberKey;renderTable();previewIndex=0;$("rangeStart").value="1";$("rangeEnd").value=String(rows.length);updateRangeControls();updatePreview()}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderTable(){const subset=rows.slice(0,4);$("tablePreview").innerHTML="<table><thead><tr>"+headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("")+"</tr></thead><tbody>"+subset.map(r=>"<tr>"+headers.map(h=>`<td>${escapeHtml(r[h]??"")}</td>`).join("")+"</tr>").join("")+"</tbody></table>"}
$("nameCol").onchange=()=>{nameKey=$("nameCol").value;updatePreview()};$("numberCol").onchange=()=>{numberKey=$("numberCol").value;updatePreview()};
$("excelFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{let data;if(f.name.toLowerCase().endsWith(".csv")){const text=await f.text();const lines=text.trim().split(/\r?\n/).map(l=>l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v=>v.replace(/^"|"$/g,"").replace(/""/g,'"')));const h=lines.shift();data=lines.map(line=>Object.fromEntries(h.map((k,i)=>[k,line[i]??""])))}else{if(!window.XLSX)throw Error("Pustaka Excel belum termuat. Periksa koneksi internet.");const wb=XLSX.read(await f.arrayBuffer(),{type:"array"});const sheet=wb.Sheets[wb.SheetNames[0]];data=XLSX.utils.sheet_to_json(sheet,{defval:""})}setRows(data)}catch(err){alert("Excel gagal dibaca: "+err.message)}e.target.value=""};
$("fontFile").onchange=async e=>{
 const file=e.target.files[0]; if(!file)return;
 try{
  const fontName=file.name.replace(/\.[^.]+$/,"").replace(/[^\w -]/g,"").trim()||"Font Tambahan";
  let uniqueName=fontName, n=2; while(customFonts.has(uniqueName)) uniqueName=fontName+" "+n++;
  const url=URL.createObjectURL(file);
  const face=new FontFace(uniqueName,`url("${url}")`);
  await face.load(); document.fonts.add(face); customFonts.set(uniqueName,{url,fileName:file.name});
  refreshFontOptions(); $("pFont").value=uniqueName;
  $("fontStatus").textContent=`Font “${uniqueName}” berhasil ditambahkan. Pilih font ini untuk teks yang dipilih, lalu font juga tersedia untuk elemen berikutnya.`;
  if(selected>=0){elements[selected].font=uniqueName;commitScopedEdits();draw(currentRow())}
 }catch(err){alert("Font tidak bisa dimuat. Coba file TTF, OTF, WOFF, atau WOFF2 yang valid.")}
 e.target.value="";
};
$("themeToggle").onclick=()=>{
 const dark=document.body.classList.toggle("dark");
 $("themeToggle").textContent=dark?"☀️ Mode terang":"🌙 Mode gelap";
 try{localStorage.setItem("yellMyHalamanTheme",dark?"dark":"light")}catch(e){}
};
try{
 if(localStorage.getItem("yellMyHalamanTheme")==="dark"){
  document.body.classList.add("dark");$("themeToggle").textContent="☀️ Mode terang";
 }
}catch(e){}
$("rangeStart").addEventListener("change",()=>{if(rows.length){const v=Math.max(1,Math.min(rows.length,Number($("rangeStart").value)||1));$("rangeStart").value=String(v);if(Number($("rangeEnd").value)<v)$("rangeEnd").value=String(v)}updateRangeControls()});
$("rangeEnd").addEventListener("change",()=>{if(rows.length){const v=Math.max(1,Math.min(rows.length,Number($("rangeEnd").value)||rows.length));$("rangeEnd").value=String(v);if(Number($("rangeStart").value)>v)$("rangeStart").value=String(v)}updateRangeControls()});
function renderCanvas(row,scale=1){const c=document.createElement("canvas");c.width=Math.round(canvas.width*scale);c.height=Math.round(canvas.height*scale);const x=c.getContext("2d");x.scale(scale,scale);x.fillStyle="#fff";x.fillRect(0,0,canvas.width,canvas.height);if(bg)x.drawImage(bg,0,0,canvas.width,canvas.height);const pageIndex=rows.indexOf(row);const pageElements=pageIndex>=0?(pageOverrides[pageIndex]||baseElements):elements;pageElements.forEach(el=>{x.save();x.strokeStyle=el.color||"#20243a";x.fillStyle=el.color||"#20243a";x.lineWidth=el.size||3;if(el.type==="Garis"){x.beginPath();x.moveTo(el.x,el.y);x.lineTo(el.x2??el.x+160,el.y2??el.y);x.stroke()}else if(el.type==="Kotak")x.strokeRect(el.x-75,el.y-35,150,70);else if(el.type==="Lingkaran"){x.beginPath();x.arc(el.x,el.y,45,0,Math.PI*2);x.stroke()}else{x.font=`${el.size||42}px ${el.font||"Arial"}`;x.textAlign=el.align||"center";x.textBaseline="middle";x.fillText(textFor(el,row),el.x,el.y)}x.restore()});return c}
function safeName(s){return String(s||"Peserta").replace(/[\\/:*?"<>|]/g,"_").trim().slice(0,100)||"Peserta"}
async function canvasBlob(c,type="image/png"){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error("Gagal membuat gambar")),type))}
$("export").onclick=async()=>{if(!bg){alert("Unggah desain halaman terlebih dahulu.");return}if(!rows.length){alert("Unggah file Excel atau CSV terlebih dahulu.");return}if(!elements.length){alert("Tambahkan elemen nama, misalnya teks {nama}.");return}const wantPNG=$("png").checked,wantPDF=$("pdf").checked,wantMerged=$("merged").checked;if(!wantPNG&&!wantPDF&&!wantMerged){alert("Pilih format keluaran.");return}if(!window.JSZip||!window.jspdf){alert("Pustaka ekspor belum termuat. Periksa koneksi internet lalu muat ulang.");return}
let selectedRows;
try{selectedRows=getExportRows()}catch(err){alert(err.message);return}
const zip=new JSZip(),folder=zip.folder("yell_DuplicateText"),scale=Number($("scale").value),prefix=safeName($("prefix").value)||"yell_DuplicateText";$("progressArea").hidden=false;$("downloads").innerHTML="";$("export").disabled=true;let merged=null;try{for(let i=0;i<selectedRows.length;i++){const {row,index:originalIndex}=selectedRows[i],name=safeName(row[nameKey]||`Halaman_${originalIndex+1}`),num=numberKey?(row[numberKey]||String(originalIndex+1).padStart(3,"0")):String(originalIndex+1).padStart(3,"0"),c=renderCanvas(row,scale),base=`${prefix}_${name}_${safeName(num)}`;if(wantPNG){folder.file(base+".png",await canvasBlob(c))}if(wantPDF||wantMerged){const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:c.width>=c.height?"landscape":"portrait",unit:"px",format:[c.width,c.height],hotfixes:["px_scaling"]});pdf.addImage(c.toDataURL("image/jpeg",.95),"JPEG",0,0,c.width,c.height);if(wantPDF)folder.file(base+".pdf",pdf.output("arraybuffer"));if(wantMerged){if(!merged)merged=pdf;else{merged.addPage([c.width,c.height],c.width>=c.height?"landscape":"portrait");merged.addImage(c.toDataURL("image/jpeg",.95),"JPEG",0,0,c.width,c.height)}}} $("progress").value=(i+1)/selectedRows.length*100;$("progressText").textContent=`Memproses halaman ${i+1} dari ${selectedRows.length} (nomor sumber ${originalIndex+1})`;await new Promise(r=>setTimeout(r,0))}
if(wantMerged&&merged)folder.file(prefix+"_Gabungan.pdf",merged.output("arraybuffer"));const blob=await zip.generateAsync({type:"blob"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="yell_DuplicateText_Hasil.zip";a.className="download";a.textContent="⬇ Unduh semua halaman (.ZIP)";$("downloads").appendChild(a);$("progressText").textContent=`Selesai: ${selectedRows.length} halaman diproses.`}catch(err){alert("Ekspor gagal: "+err.message)}finally{$("export").disabled=false}};
$("exportTop").onclick=()=>$("export").scrollIntoView({behavior:"smooth",block:"center"});
$("saveProject").onclick=()=>{const data={version:3,app:"yell_DuplicateText",canvas:{width:canvas.width,height:canvas.height},background:bgURL,elements:baseElements.length?baseElements:elements,pageOverrides,customFonts:[...customFonts.keys()]};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="Proyek.yell_DuplicateText.json";a.click();URL.revokeObjectURL(a.href)};
$("projectFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const p=JSON.parse(await f.text());elements=p.elements||[];baseElements=cloneElements(elements);pageOverrides=p.pageOverrides||{};selected=-1;listElements();updateProps();if(p.background){const im=new Image();im.onload=()=>{bg=im;canvas.width=p.canvas?.width||im.width;canvas.height=p.canvas?.height||im.height;draw();updatePreview()};im.src=p.background}else{draw();updatePreview()} }catch(err){alert("File proyek tidak valid: "+err.message)}e.target.value=""};
$("undo").onclick=()=>{if(!history.length)return;future.push(JSON.stringify({elements,bgURL}));const p=JSON.parse(history.pop());elements=p.elements||[];commitScopedEdits();selected=-1;listElements();updateProps();draw(currentRow())};$("redo").onclick=()=>{if(!future.length)return;history.push(JSON.stringify({elements,bgURL}));const p=JSON.parse(future.pop());elements=p.elements||[];commitScopedEdits();listElements();updateProps();draw(currentRow())};
$("empty").hidden=false;baseElements=cloneElements();draw();listElements();updateProps();updateRangeControls();updateEditScopeUI();
})();