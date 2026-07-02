using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Application.Features.Scheduling.Dtos;
using MechanicShop.Domain.Common.Results;

namespace MechanicShop.Application.Features.Scheduling.Queries.GetDailyScheduleQuery;

public sealed record GetDailyScheduleQuery(
    TimeZoneInfo TimeZone,
    DateOnly ScheduleDate,
    TimeOnly OpeningTime,
    TimeOnly ClosingTime,
    Guid? LaborId = null) : ICachedQuery<Result<ScheduleDto>>
{
    public string CacheKey => $"work-order:{ScheduleDate:yyyy-MM-dd}:hours={OpeningTime:HH:mm}-{ClosingTime:HH:mm}:labor={LaborId?.ToString() ?? "-"}";
    public string[] Tags => ["work-order"];
    public TimeSpan Expiration => TimeSpan.FromMinutes(10);
}