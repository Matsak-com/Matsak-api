import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ProductService } from '../../product/product.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const program = new Command();

program
  .command('reindex-products')
  .description('Reindex all products in Elasticsearch')
  .option('-v, --verbose', 'Show detailed progress', false)
  .action(async (options) => {
    const app = await NestFactory.createApplicationContext(AppModule);

    // Wait for MongoDB connection
    const connection = app.get<Connection>(getConnectionToken());
    if (connection.readyState !== 1) {
      console.log('⏳ Waiting for MongoDB connection...');
      await new Promise((resolve) => {
        connection.once('connected', resolve);
      });
    }
    console.log('✅ MongoDB connected');

    const productService = app.get(ProductService);

    try {
      console.log('🔄 Starting product reindexing...');

      if (options.verbose) {
        console.log('📋 Fetching products from database...');
      }

      const result = await productService.reindexAll();

      console.log('✅ Reindexing completed successfully!');
      console.log(`📊 Total products indexed: ${result.totalProducts}`);

      if (options.verbose) {
        console.log(`📋 Details:`, result);
      }

      await app.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during reindexing:', error.message);
      if (options.verbose) {
        console.error('Stack trace:', error.stack);
      }
      await app.close();
      process.exit(1);
    }
  });

program.parse(process.argv);
