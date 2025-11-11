import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchService } from './elasticsearch.service';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get('ELASTICSEARCH_NODE') || 'http://localhost:9200',
        auth: {
          username: configService.get('ELASTICSEARCH_USER') || 'elastic',
          password: (() => {
            const pwd = configService.get('ELASTICSEARCH_PASSWORD');
            if (!pwd) {
              throw new Error('ELASTICSEARCH_PASSWORD environment variable must be set and must not use the default "changeme" in production.');
            }
            return pwd;
          })(),
        },
      }),
    }),
  ],
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class SearchModule {}