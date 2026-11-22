import 'reflect-metadata';
import 'dotenv/config';
import {NestFactory} from '@nestjs/core';
import {ValidationPipe} from '@nestjs/common';
import {NestExpressApplication} from '@nestjs/platform-express';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import express from 'express';
import {AppModule} from './server';

async function bootstrap(){
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to a random string of at least 32 characters');
  const app=await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  if (process.env.CLIENT_ORIGIN) app.enableCors({origin:process.env.CLIENT_ORIGIN});
  const webDir=join(__dirname,'../../frontend/dist');
  if (existsSync(join(webDir,'index.html'))) {
    app.useStaticAssets(webDir,{index:false});
    app.use((req:express.Request,res:express.Response,next:express.NextFunction)=>{
      if(req.method==='GET' && !req.path.startsWith('/api'))return res.sendFile(join(webDir,'index.html'));
      next();
    });
  }
  const port=Number(process.env.PORT)||4000;
  await app.listen(port,'0.0.0.0');
  console.log(`DSS service listening on port ${port}`);
}
bootstrap().catch(e=>{console.error(e);process.exitCode=1});