import multer from "multer";
import path from "path";
import fs from "fs";

const dir=path.resolve(process.env.UPLOAD_DIR||"uploads","hostels");
fs.mkdirSync(dir,{recursive:true});
const allowed=new Set(["image/jpeg","image/png","image/webp"]);

const storage=multer.diskStorage({
  destination:(_req,_file,cb)=>cb(null,dir),
  filename:(_req,file,cb)=>{
    const ext=path.extname(file.originalname).toLowerCase();
    cb(null,`${Date.now()}-${Math.random().toString(36).slice(2,10)}${ext}`);
  }
});

export const hostelPhotos=multer({
  storage,
  limits:{fileSize:Number(process.env.MAX_FILE_SIZE_MB||5)*1024*1024,files:10},
  fileFilter:(_req,file,cb)=>allowed.has(file.mimetype)
    ? cb(null,true) : cb(new Error("Only JPG, PNG and WEBP images are allowed"))
});