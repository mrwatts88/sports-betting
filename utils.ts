export const wait = (ms: number): Promise<void> => {
  return new Promise<void>((resolve: () => void): void => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
