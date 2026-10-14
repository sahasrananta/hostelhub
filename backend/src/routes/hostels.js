import express from "express";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import {getDb} from "../config/db.js";
import {authenticate,authorize} from "../middleware/auth.js";
import {hostelPhotos} from "../middleware/upload.js";

const router=express.Router();

const locationAliases = {
  mlrit: ["mlrit", "maisammaguda", "dundigal", "gundlapochampally", "bowrampet", "bachupally", "medchal"],
  cmrit: ["cmrit", "kandlakoya", "medchal", "kompally", "gundlapochampally"],
  "vnr vjiet": ["vnr vjiet", "bachupally", "nizampet", "pragathi nagar", "kukatpally"],
  jntuh: ["jntuh", "kukatpally", "balkampet", "miyapur", "nizampet"],
  "iiit hyderabad": ["iiit hyderabad", "gachibowli", "nallagandla", "lingampally", "serilingampally"],
  medchal: ["medchal", "dundigal", "gandimaisamma", "domarapochampally", "maisammaguda", "gundlapochampally", "bowrampet", "bahadurpally", "kompally", "quthbullapur"]
};

function searchTerms(value) {
  const term = String(value || "").trim().toLowerCase();
  return locationAliases[term] || [term];
}

function locationClause(value, columns, params) {
  const terms = searchTerms(value).filter(Boolean);
  const matches = [];
  for (const term of terms) {
    const pattern = `%${term}%`;
    matches.push(`(${columns.map((column) => `LOWER(COALESCE(${column}, '')) LIKE ?`).join(" OR ")})`);
    params.push(...columns.map(() => pattern));
  }
  return matches.length ? `(${matches.join(" OR ")})` : "1 = 1";
}

async function full(db, id) {
  const h = await db.get("SELECT * FROM hostels WHERE id=?", id);

  if (!h) return null;

  h.amenities = JSON.parse(h.amenities || "[]");
  h.rules = JSON.parse(h.rules || "[]");

  h.photos = await db.all(
    "SELECT id,filename,original_name,url,created_at FROM hostel_photos WHERE hostel_id=? ORDER BY id DESC",
    id
  );

  h.rooms = await db.all(
    `SELECT r.*, COALESCE((SELECT json_group_array(json_object('id', b.id, 'bed_label', b.bed_label, 'status', b.status))
      FROM beds b WHERE b.room_id = r.id), '[]') AS beds
     FROM rooms r WHERE r.hostel_id=? ORDER BY r.floor_number, r.room_number, r.id`,
    id
  );
  h.rooms = h.rooms.map((room) => ({ ...room, beds: JSON.parse(room.beds || "[]") }));

  h.menu = await db.all(
    "SELECT * FROM menu_items WHERE hostel_id=? ORDER BY id",
    id
  );

  h.updates = await db.all(
    "SELECT * FROM updates WHERE hostel_id=? ORDER BY id DESC",
    id
  );

  h.reviews = await db.all(
    `SELECT reviews.*, users.name AS user_name
     FROM reviews
     JOIN users ON users.id = reviews.user_id
     WHERE reviews.hostel_id = ? AND reviews.is_hidden = 0
     ORDER BY reviews.id DESC`,
    id
  );

  h.available_beds = h.rooms.reduce(
    (total, room) => total + Number(room.available_beds || 0),
    0
  );

  h.price = h.rooms.length
    ? Math.min(...h.rooms.map(room => Number(room.price_per_month)))
    : null;

  return h;
}

router.get("/",async(req,res)=>{
  try{
    const db=await getDb(); const {q,city,gender,room_type,amenity,min_price,max_price,min_beds,min_rating}=req.query; const p=[]; const w=["h.status = 'approved'"]; const having=[];
    let sql=`SELECT h.*,COALESCE(AVG(r.rating),0) rating,COUNT(DISTINCT r.id) review_count,
      COALESCE(SUM(ro.available_beds),0) available_beds,
      COALESCE(MIN(ro.price_per_month),0) price,GROUP_CONCAT(DISTINCT ro.room_type) room_types FROM hostels h
      LEFT JOIN reviews r ON r.hostel_id=h.id AND r.is_hidden=0 LEFT JOIN rooms ro ON ro.hostel_id=h.id`;
    const locationColumns = ["h.name", "h.city", "h.address", "h.description"];
    if(city){w.push(locationClause(city, locationColumns, p));}
    if(q){w.push(locationClause(q, locationColumns, p));}
    if(gender && gender !== "All") w.push("(h.gender = ? OR (? = 'Co-ed' AND h.gender = 'Co-living'))"), p.push(gender, gender);
    if(room_type) w.push("EXISTS (SELECT 1 FROM rooms rf WHERE rf.hostel_id = h.id AND rf.room_type = ?)"), p.push(room_type);
    if(amenity) w.push("LOWER(COALESCE(h.amenities, '')) LIKE LOWER(?)"), p.push(`%${amenity}%`);
    if(Number.isFinite(Number(min_price))) having.push("COALESCE(MIN(ro.price_per_month), 0) >= ?"), p.push(Number(min_price));
    if(Number.isFinite(Number(max_price))) having.push("COALESCE(MIN(ro.price_per_month), 0) <= ?"), p.push(Number(max_price));
    if(Number.isFinite(Number(min_beds))) having.push("COALESCE(SUM(ro.available_beds), 0) >= ?"), p.push(Number(min_beds));
    if(Number.isFinite(Number(min_rating))) having.push("COALESCE(AVG(r.rating), 0) >= ?"), p.push(Number(min_rating));
    if(w.length)sql+=" WHERE "+w.join(" AND "); sql+=" GROUP BY h.id"; if (having.length) sql += " HAVING " + having.join(" AND "); sql += " ORDER BY h.id DESC";
    const hs=await db.all(sql,...p);
    for (const h of hs) {
      try {
        h.amenities = JSON.parse(h.amenities || "[]");
      } catch {
        h.amenities = [];
      }
      try {
        h.rules = JSON.parse(h.rules || "[]");
      } catch {
        h.rules = [];
      }
      h.photos = await db.all(
        "SELECT id,url FROM hostel_photos WHERE hostel_id=? ORDER BY id DESC",
        h.id
      );
    }
    res.json(hs);
  }catch(e){res.status(500).json({message:"Failed to load hostels",error:e.message});}
});
router.get("/mine", authenticate, authorize("owner"), async (req, res) => {
  try {
    const db = await getDb();

    const rows = await db.all(
      "SELECT id FROM hostels WHERE owner_id = ? ORDER BY id DESC",
      req.user.id
    );

    const hostels = [];

    for (const row of rows) {
      const hostel = await full(db, row.id);
      if (hostel) {
        hostels.push(hostel);
      }
    }

    res.json(hostels);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load your hostels",
      error: error.message
    });
  }
});
router.get("/:id",async(req,res)=>{
  try {
    const db = await getDb();
    const h = await full(db, req.params.id);
    if (!h) return res.status(404).json({message:"Hostel not found"});

    if (h.status !== "approved") {
      let isAllowed = false;
      const header = req.headers.authorization;
      if (header?.startsWith("Bearer ")) {
        try {
          const token = header.slice(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded.role === "admin" || decoded.id === h.owner_id) {
            isAllowed = true;
          }
        } catch {}
      }
      if (!isAllowed) {
        return res.status(404).json({message:"Hostel not found or pending approval"});
      }
    }

    return res.json(h);
  } catch (error) {
    return res.status(500).json({message:"Failed to load hostel", error:error.message});
  }
});

router.post("/",authenticate,authorize("owner"),async(req,res)=>{
  try{
    const {name,city,address,description,gender,phone,email,amenities=[],rules=[]}=req.body,db=await getDb();
    if(!name||!city)return res.status(400).json({message:"Hostel name and city are required"});
    const r=await db.run(`INSERT INTO hostels(owner_id,name,city,address,description,gender,phone,email,amenities,rules,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,'pending')`,req.user.id,name,city,address||null,description||null,gender||null,phone||null,email||null,JSON.stringify(amenities),JSON.stringify(rules));
    res.status(201).json(await full(db,r.lastID));
  }catch(e){res.status(500).json({message:"Failed to create hostel",error:e.message});}
});

router.put("/:id",authenticate,authorize("owner"),async(req,res)=>{
  const db=await getDb(),ok=await db.get("SELECT id FROM hostels WHERE id=? AND owner_id=?",req.params.id,req.user.id);
  if(!ok)return res.status(404).json({message:"Hostel not found"});
  const {name,city,address,description,gender,phone,email,amenities=[],rules=[]}=req.body;
  await db.run(`UPDATE hostels SET name=?,city=?,address=?,description=?,gender=?,phone=?,email=?,amenities=?,rules=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    name,city,address||null,description||null,gender||null,phone||null,email||null,JSON.stringify(amenities),JSON.stringify(rules),req.params.id);
  res.json(await full(db,req.params.id));
});

router.post("/:id/photos",authenticate,authorize("owner"),hostelPhotos.array("photos",10),async(req,res)=>{
  try{
    const db=await getDb(),ok=await db.get("SELECT id FROM hostels WHERE id=? AND owner_id=?",req.params.id,req.user.id);
    if(!ok){
      for(const f of req.files||[])if(fs.existsSync(f.path))fs.unlinkSync(f.path);
      return res.status(404).json({message:"Hostel not found"});
    }
    if(!req.files?.length)return res.status(400).json({message:"No photos uploaded"});
    const photos=[];
    for(const f of req.files){
      const url=`/uploads/hostels/${f.filename}`;
      await db.run("INSERT INTO hostel_photos(hostel_id,filename,original_name,url) VALUES(?,?,?,?)",req.params.id,f.filename,f.originalname,url);
      photos.push({filename:f.filename,url});
    }
    res.status(201).json({message:"Photos uploaded successfully",photos});
  }catch(e){res.status(500).json({message:"Photo upload failed",error:e.message});}
});

router.delete("/:id/photos/:photoId",authenticate,authorize("owner"),async(req,res)=>{
  const db=await getDb();
  const p=await db.get(`SELECT hp.* FROM hostel_photos hp JOIN hostels h ON h.id=hp.hostel_id
    WHERE hp.id=? AND hp.hostel_id=? AND h.owner_id=?`,req.params.photoId,req.params.id,req.user.id);
  if(!p)return res.status(404).json({message:"Photo not found"});
  const fp=path.join(path.resolve(process.env.UPLOAD_DIR||"uploads","hostels"),p.filename);
  if(fs.existsSync(fp))fs.unlinkSync(fp);
  await db.run("DELETE FROM hostel_photos WHERE id=?",req.params.photoId);
  res.json({message:"Photo deleted successfully"});
});
export default router;