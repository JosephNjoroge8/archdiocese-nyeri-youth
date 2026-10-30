<?php

namespace Tests\Feature;

use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_frontend_routes_use_the_spa_shell_without_catching_api_paths(): void
    {
        $indexPath = public_path('index.html');
        $originalIndex = is_file($indexPath) ? file_get_contents($indexPath) : null;

        if ($originalIndex === false) {
            throw new \RuntimeException('Unable to read the existing frontend index file.');
        }

        try {
            if (file_put_contents($indexPath, '<!doctype html><title>SPA test shell</title>') === false) {
                throw new \RuntimeException('Unable to create the temporary frontend index file.');
            }

            foreach (['/', '/register'] as $path) {
                $response = $this->get($path);

                $response->assertOk();
                $this->assertInstanceOf(BinaryFileResponse::class, $response->baseResponse);
                $this->assertSame($indexPath, $response->baseResponse->getFile()->getPathname());
            }

            $this->get('/up')->assertOk();
            $this->getJson('/api/v1/not-a-route')->assertNotFound();
        } finally {
            if ($originalIndex === null) {
                if (is_file($indexPath) && ! unlink($indexPath)) {
                    throw new \RuntimeException('Unable to remove the temporary frontend index file.');
                }
            } elseif (file_put_contents($indexPath, $originalIndex) === false) {
                throw new \RuntimeException('Unable to restore the existing frontend index file.');
            }
        }
    }
}
