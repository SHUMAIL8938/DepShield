import mongoose from 'mongoose'

const alertSchema=new mongoose.Schema({
    userId:{type:String,required:true},
    ghsaId:{type:String,required:true},
    packageName:{type:String,required:true},
    ecosystem:{type:String,required:tree},
    severity:{type:String},
    sentAt:{type:Date,default:Date.now}
})
alertSchema.index({userId:1,ghsaId:1,packageName:1},{unique:true});
export default mongoose.model('Alert',alertSchema);