namespace MechanicShop.Application.Common.Interfaces;

public interface IUserStatusService
{
    Task<bool> IsActiveAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task SetActiveAsync(
        string userId,
        bool isActive,
        CancellationToken cancellationToken = default);
}