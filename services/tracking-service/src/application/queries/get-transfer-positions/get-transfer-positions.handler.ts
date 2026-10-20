import type { IGpsReadingReadRepository } from '../../contracts/gps-reading.read.repository';
import type { PositionReadDto } from '../../dtos/position-read.dto';
import type { GetTransferPositionsQuery } from './get-transfer-positions.query';

export class GetTransferPositionsHandler {
  constructor(private readonly gpsReadingReadRepository: IGpsReadingReadRepository) {}

  async execute(query: GetTransferPositionsQuery): Promise<PositionReadDto[]> {
    return this.gpsReadingReadRepository.getRecentByTransfer(query.transferId, query.limit);
  }
}
