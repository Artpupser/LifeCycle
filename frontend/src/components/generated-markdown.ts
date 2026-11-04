/** Repair escaped prose line breaks without rewriting code blocks or inline code. */
export function generatedMarkdown(value:string){
 return value.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`]*`)/g).map((part,index)=>index%2?part:part.replace(/\\r\\n|\\n/g,"\n")).join("");
}
