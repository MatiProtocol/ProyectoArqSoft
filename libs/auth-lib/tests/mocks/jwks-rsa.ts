const mockGetSigningKey = jest.fn();

const mockClient = {
  getSigningKey: mockGetSigningKey,
};

const jwksClient = jest.fn().mockReturnValue(mockClient);

export { mockClient, mockGetSigningKey };
export default jwksClient;
