import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ReceiptController } from './receipt.controller';
import { ReceiptService } from './receipt.service';
import { ReceiptRepository } from './receipt.repository';
import { ReceiptStorageService } from '../storage/receipt-storage.service';
import { OcrService } from '../ocr/ocr.service';
import { DatabaseModule } from '../database/database.module';
import { ExpenseModule } from '../expenses/expense.module';

@Module({
  imports: [
    DatabaseModule,
    ExpenseModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1, // Single file upload
      },
      fileFilter: (req, file, callback) => {
        // Allow only specific file types
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error(`File type '${file.mimetype}' is not allowed`), false);
        }
      },
    }),
  ],
  controllers: [ReceiptController],
  providers: [
    ReceiptService,
    ReceiptRepository,
    ReceiptStorageService,
    OcrService,
  ],
  exports: [
    ReceiptService,
    ReceiptRepository,
    ReceiptStorageService,
    OcrService,
  ],
})
export class ReceiptModule {}
