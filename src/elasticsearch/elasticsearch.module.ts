import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SearchService } from './elasticsearch.service';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const config: any = {
          node:
            configService.get('ELASTICSEARCH_NODE') || 'http://localhost:9200',
        };

        // Only add auth if credentials are provided
        const username = configService.get('ELASTICSEARCH_USER');
        const password = configService.get('ELASTICSEARCH_PASSWORD');

        if (username && password) {
          config.auth = {
            username,
            password,
          };
        }

        return config;
      },
    }),
  ],
  providers: [SearchService],
  exports: [SearchService, ElasticsearchModule],
})
export class SearchModule {}