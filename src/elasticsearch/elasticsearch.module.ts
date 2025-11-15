import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
              throw new Error('ELASTICSEARCH_PASSWORD must be set');
            }
            return pwd;
          })(),
        },
      }),
    }),
  ],
  exports: [ElasticsearchModule],
})
export class SearchModule {}