using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Common.Results.Abstractions;
using MediatR;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Common.Behaviours;

public class CachingBehavior<TRequest, TResponse>(
    HybridCache cache,
    ILogger<CachingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly HybridCache _cache = cache;
    private readonly ILogger<CachingBehavior<TRequest, TResponse>> _logger = logger;
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        // Only queries that implement ICachedQuery use caching. The successful
        // cast also gives us the query's CacheKey, Tags, and Expiration values.
        if (request is not ICachedQuery cachedRequest)
        {
            return await next(ct);
        }

        _logger.LogInformation("Checking cache for {RequestName}", typeof(TRequest).Name);

        var result = await _cache.GetOrCreateAsync<TResponse>(
            cachedRequest.CacheKey,
            // On a cache miss, intentionally return null instead of executing
            // the handler here. This lets us cache only successful results below.
            _ => new ValueTask<TResponse>((TResponse)(object)null!),
            new HybridCacheEntryOptions
            {
                // Check the configured cache layers without loading source data.
                Flags = HybridCacheEntryFlags.DisableUnderlyingData
            }, cancellationToken: ct);

        if (result is null)
        {
            // Cache miss: run the real query handler and retrieve fresh data.
            result = await next(ct);

            if (result is IResult res && res.IsSuccess)
            {
                _logger.LogInformation("Caching result for {RequestName}", typeof(TRequest).Name);

                // Save the successful response using the values supplied by the
                // query through ICachedQuery. Failed results are never cached.
                await _cache.SetAsync(cachedRequest.CacheKey,
                result,
                new HybridCacheEntryOptions { Expiration = cachedRequest.Expiration },
                 cachedRequest.Tags,
                 ct);
            }
        }

        return result;
    }
}
