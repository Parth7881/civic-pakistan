declare module 'piexifjs' {
 const piexif: {
  dump(value:Record<string,unknown>):string
  insert(exif:string,jpeg:string):string
 }
 export default piexif
}
