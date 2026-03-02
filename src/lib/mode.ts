export function isMockMode(): boolean {
    return process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
}
