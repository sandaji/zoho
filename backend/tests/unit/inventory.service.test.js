const mockGetNextNumber = jest.fn();
const mockStockTransferCreate = jest.fn();

jest.mock('../../src/lib/db', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('../../src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../src/lib/errors', () => ({
  notFoundError: jest.fn((resource) => new Error(`${resource} not found`)),
  AppError: class AppError extends Error {
    constructor(code, status, message) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  ErrorCode: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
    INVALID_STATUS: 'INVALID_STATUS',
  },
}));

jest.mock('../../src/lib/inventory-sync', () => ({
  synchronizeBranchInventoryForWarehouse: jest.fn(),
}));

jest.mock('../../src/modules/sequences/sequence.service', () => ({
  SequenceService: {
    getNextNumber: mockGetNextNumber,
  },
}));

const { InventoryService } = require('../../src/modules/inventory/service/inventory.service');
const { prisma } = require('../../src/lib/db');

describe('InventoryService.requestTransfer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNextNumber.mockResolvedValue('TR-1001');
  });

  it('creates a transfer in pending approval state', async () => {
    const transactionClient = {
      stockTransfer: {
        create: mockStockTransferCreate,
      },
    };

    prisma.$transaction.mockImplementation(async (callback) => callback(transactionClient));
    mockStockTransferCreate.mockResolvedValue({ id: 'transfer-1', items: [] });

    const service = new InventoryService();
    service.prisma = prisma;

    await service.requestTransfer('user-1', {
      sourceWarehouseId: 'wh-1',
      destinationWarehouseId: 'wh-2',
      notes: 'Transfer request',
      items: [{ productId: 'product-1', requested_qty: 5 }],
    });

    expect(mockStockTransferCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING_APPROVAL' }),
      }),
    );
  });
});
