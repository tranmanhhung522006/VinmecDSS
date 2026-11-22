import 'reflect-metadata';
import 'dotenv/config';
import {NestFactory} from '@nestjs/core';
import {ValidationPipe} from '@nestjs/common';
import {AppModule} from './server';
async function bootstrap(){
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to a random string of at least 32 characters');
  const app=await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  app.enableCors({origin:process.env.CLIENT_ORIGIN || 'http://localhost:5173'});
  await app.listen(Number(process.env.PORT)||4000);
  console.log('Vinmec DSS demo API listening on http://localhost:'+ (process.env.PORT||4000));
}
bootstrap();