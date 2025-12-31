-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "sales_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
