# meshpoke_api.api.DefaultApi

## Load the API package
```dart
import 'package:meshpoke_api/api.dart';
```

All URIs are relative to *https://api.meshpoke.com*

Method | HTTP request | Description
------------- | ------------- | -------------
[**v1AdminFinanceOverviewGet**](DefaultApi.md#v1adminfinanceoverviewget) | **GET** /v1/admin/finance/overview | 
[**v1AdminMerchantClaimsGet**](DefaultApi.md#v1adminmerchantclaimsget) | **GET** /v1/admin/merchant-claims | 
[**v1AdminMerchantClaimsIdPost**](DefaultApi.md#v1adminmerchantclaimsidpost) | **POST** /v1/admin/merchant-claims/{id} | 
[**v1AdminMerchantFinanceBandAuditGet**](DefaultApi.md#v1adminmerchantfinancebandauditget) | **GET** /v1/admin/merchant-finance/band-audit | 
[**v1AdminMerchantFinanceBandAuditVenueIdPost**](DefaultApi.md#v1adminmerchantfinancebandauditvenueidpost) | **POST** /v1/admin/merchant-finance/band-audit/{venueId} | 
[**v1AdminMerchantFinanceDisputesGet**](DefaultApi.md#v1adminmerchantfinancedisputesget) | **GET** /v1/admin/merchant-finance/disputes | 
[**v1AdminMerchantFinanceDisputesIdResolvePost**](DefaultApi.md#v1adminmerchantfinancedisputesidresolvepost) | **POST** /v1/admin/merchant-finance/disputes/{id}/resolve | 
[**v1AdminMerchantFinanceFoundingGet**](DefaultApi.md#v1adminmerchantfinancefoundingget) | **GET** /v1/admin/merchant-finance/founding | 
[**v1AdminMerchantFinanceHealthGet**](DefaultApi.md#v1adminmerchantfinancehealthget) | **GET** /v1/admin/merchant-finance/health | 
[**v1AdminMerchantFinanceVenuesIdLedgerGet**](DefaultApi.md#v1adminmerchantfinancevenuesidledgerget) | **GET** /v1/admin/merchant-finance/venues/{id}/ledger | 
[**v1AdminMetricsGet**](DefaultApi.md#v1adminmetricsget) | **GET** /v1/admin/metrics | 
[**v1AdminModerationQueueGet**](DefaultApi.md#v1adminmoderationqueueget) | **GET** /v1/admin/moderation/queue | 
[**v1AdminModerationUserIdActionPost**](DefaultApi.md#v1adminmoderationuseridactionpost) | **POST** /v1/admin/moderation/{userId}/action | 
[**v1AdminReportsIdResolvePost**](DefaultApi.md#v1adminreportsidresolvepost) | **POST** /v1/admin/reports/{id}/resolve | 
[**v1AdminUsersGet**](DefaultApi.md#v1adminusersget) | **GET** /v1/admin/users | 
[**v1AdminUsersIdGet**](DefaultApi.md#v1adminusersidget) | **GET** /v1/admin/users/{id} | 
[**v1AdminUsersIdModeratePost**](DefaultApi.md#v1adminusersidmoderatepost) | **POST** /v1/admin/users/{id}/moderate | 
[**v1AdminVenueReportsGet**](DefaultApi.md#v1adminvenuereportsget) | **GET** /v1/admin/venue-reports | 
[**v1AdminVenueReportsIdResolvePost**](DefaultApi.md#v1adminvenuereportsidresolvepost) | **POST** /v1/admin/venue-reports/{id}/resolve | 
[**v1AdminVenuesGeocodeFailedGet**](DefaultApi.md#v1adminvenuesgeocodefailedget) | **GET** /v1/admin/venues/geocode-failed | 
[**v1AdminVenuesIdPinPost**](DefaultApi.md#v1adminvenuesidpinpost) | **POST** /v1/admin/venues/{id}/pin | 
[**v1AdminVenuesMergePost**](DefaultApi.md#v1adminvenuesmergepost) | **POST** /v1/admin/venues/merge | 
[**v1AdminWaitlistGet**](DefaultApi.md#v1adminwaitlistget) | **GET** /v1/admin/waitlist | 
[**v1ApplicationsIdDecisionPost**](DefaultApi.md#v1applicationsiddecisionpost) | **POST** /v1/applications/{id}/decision | 
[**v1BillingCheckoutPost**](DefaultApi.md#v1billingcheckoutpost) | **POST** /v1/billing/checkout | 
[**v1BillingPortalPost**](DefaultApi.md#v1billingportalpost) | **POST** /v1/billing/portal | 
[**v1BlocksUserIdDelete**](DefaultApi.md#v1blocksuseriddelete) | **DELETE** /v1/blocks/{userId} | 
[**v1BlocksUserIdPost**](DefaultApi.md#v1blocksuseridpost) | **POST** /v1/blocks/{userId} | 
[**v1ConnectionsGet**](DefaultApi.md#v1connectionsget) | **GET** /v1/connections | 
[**v1ConnectionsIdDisconnectPost**](DefaultApi.md#v1connectionsiddisconnectpost) | **POST** /v1/connections/{id}/disconnect | 
[**v1CrewsGet**](DefaultApi.md#v1crewsget) | **GET** /v1/crews | 
[**v1CrewsIdLeavePost**](DefaultApi.md#v1crewsidleavepost) | **POST** /v1/crews/{id}/leave | 
[**v1CrewsIdPatch**](DefaultApi.md#v1crewsidpatch) | **PATCH** /v1/crews/{id} | 
[**v1CrewsIdRebookPost**](DefaultApi.md#v1crewsidrebookpost) | **POST** /v1/crews/{id}/rebook | 
[**v1CrewsIdRebooksGet**](DefaultApi.md#v1crewsidrebooksget) | **GET** /v1/crews/{id}/rebooks | 
[**v1DistrictsGet**](DefaultApi.md#v1districtsget) | **GET** /v1/districts | 
[**v1DistrictsIdSpotsGet**](DefaultApi.md#v1districtsidspotsget) | **GET** /v1/districts/{id}/spots | 
[**v1DropsIdClaimPost**](DefaultApi.md#v1dropsidclaimpost) | **POST** /v1/drops/{id}/claim | 
[**v1HealthGet**](DefaultApi.md#v1healthget) | **GET** /v1/health | 
[**v1InternalAutomationBirthdayPost**](DefaultApi.md#v1internalautomationbirthdaypost) | **POST** /v1/internal/automation-birthday | 
[**v1InternalAutomationWinbackPost**](DefaultApi.md#v1internalautomationwinbackpost) | **POST** /v1/internal/automation-winback | 
[**v1InternalCouponCheckPost**](DefaultApi.md#v1internalcouponcheckpost) | **POST** /v1/internal/coupon-check | 
[**v1InternalCrewSweepPost**](DefaultApi.md#v1internalcrewsweeppost) | **POST** /v1/internal/crew-sweep | 
[**v1InternalEnforcementUserIdGet**](DefaultApi.md#v1internalenforcementuseridget) | **GET** /v1/internal/enforcement/{userId} | 
[**v1InternalMembershipSweepPost**](DefaultApi.md#v1internalmembershipsweeppost) | **POST** /v1/internal/membership-sweep | 
[**v1InternalMerchantInvoiceRunPost**](DefaultApi.md#v1internalmerchantinvoicerunpost) | **POST** /v1/internal/merchant-invoice-run | 
[**v1InternalPokeExpiryPost**](DefaultApi.md#v1internalpokeexpirypost) | **POST** /v1/internal/poke-expiry | 
[**v1InternalScoreRecomputePost**](DefaultApi.md#v1internalscorerecomputepost) | **POST** /v1/internal/score-recompute | 
[**v1InternalSpotSweepPost**](DefaultApi.md#v1internalspotsweeppost) | **POST** /v1/internal/spot-sweep | 
[**v1MapViewportGet**](DefaultApi.md#v1mapviewportget) | **GET** /v1/map/viewport | 
[**v1MeActivityGet**](DefaultApi.md#v1meactivityget) | **GET** /v1/me/activity | 
[**v1MeActivityReadPost**](DefaultApi.md#v1meactivityreadpost) | **POST** /v1/me/activity/read | 
[**v1MeCapsGet**](DefaultApi.md#v1mecapsget) | **GET** /v1/me/caps | 
[**v1MeCouponsGet**](DefaultApi.md#v1mecouponsget) | **GET** /v1/me/coupons | 
[**v1MeDelete**](DefaultApi.md#v1medelete) | **DELETE** /v1/me | 
[**v1MeExportGet**](DefaultApi.md#v1meexportget) | **GET** /v1/me/export | 
[**v1MeGet**](DefaultApi.md#v1meget) | **GET** /v1/me | 
[**v1MeHostedGet**](DefaultApi.md#v1mehostedget) | **GET** /v1/me/hosted | 
[**v1MeKeywordsGet**](DefaultApi.md#v1mekeywordsget) | **GET** /v1/me/keywords | 
[**v1MeKeywordsPut**](DefaultApi.md#v1mekeywordsput) | **PUT** /v1/me/keywords | 
[**v1MeLocationPingPost**](DefaultApi.md#v1melocationpingpost) | **POST** /v1/me/location-ping | 
[**v1MeMembershipsGet**](DefaultApi.md#v1memembershipsget) | **GET** /v1/me/memberships | 
[**v1MeNotificationPrefsGet**](DefaultApi.md#v1menotificationprefsget) | **GET** /v1/me/notification-prefs | 
[**v1MeNotificationPrefsPatch**](DefaultApi.md#v1menotificationprefspatch) | **PATCH** /v1/me/notification-prefs | 
[**v1MeOnboardPost**](DefaultApi.md#v1meonboardpost) | **POST** /v1/me/onboard | 
[**v1MePatch**](DefaultApi.md#v1mepatch) | **PATCH** /v1/me | 
[**v1MePhoneConfirmPost**](DefaultApi.md#v1mephoneconfirmpost) | **POST** /v1/me/phone/confirm | 
[**v1MePhoneOtpPost**](DefaultApi.md#v1mephoneotppost) | **POST** /v1/me/phone/otp | 
[**v1MePokeBalanceGet**](DefaultApi.md#v1mepokebalanceget) | **GET** /v1/me/poke-balance | 
[**v1MePushTokensPost**](DefaultApi.md#v1mepushtokenspost) | **POST** /v1/me/push-tokens | 
[**v1MeQrGet**](DefaultApi.md#v1meqrget) | **GET** /v1/me/qr | 
[**v1MeReferralsGet**](DefaultApi.md#v1mereferralsget) | **GET** /v1/me/referrals | 
[**v1MeSpotsAttendedGet**](DefaultApi.md#v1mespotsattendedget) | **GET** /v1/me/spots/attended | 
[**v1MeWalletDropsGet**](DefaultApi.md#v1mewalletdropsget) | **GET** /v1/me/wallet/drops | 
[**v1MerchantBillingCancelPost**](DefaultApi.md#v1merchantbillingcancelpost) | **POST** /v1/merchant/billing/cancel | 
[**v1MerchantBillingInvoicesGet**](DefaultApi.md#v1merchantbillinginvoicesget) | **GET** /v1/merchant/billing/invoices | 
[**v1MerchantBillingSeatChargesGet**](DefaultApi.md#v1merchantbillingseatchargesget) | **GET** /v1/merchant/billing/seat-charges | 
[**v1MerchantBillingSetupIntentPost**](DefaultApi.md#v1merchantbillingsetupintentpost) | **POST** /v1/merchant/billing/setup-intent | 
[**v1MerchantBillingSubscribePost**](DefaultApi.md#v1merchantbillingsubscribepost) | **POST** /v1/merchant/billing/subscribe | 
[**v1MerchantClaimPost**](DefaultApi.md#v1merchantclaimpost) | **POST** /v1/merchant/claim | 
[**v1MerchantClaimPresignPost**](DefaultApi.md#v1merchantclaimpresignpost) | **POST** /v1/merchant/claim/presign | 
[**v1MerchantCouponsIssuePost**](DefaultApi.md#v1merchantcouponsissuepost) | **POST** /v1/merchant/coupons/issue | 
[**v1MerchantDropsIdCostEstimateGet**](DefaultApi.md#v1merchantdropsidcostestimateget) | **GET** /v1/merchant/drops/{id}/cost-estimate | 
[**v1MerchantDropsIdPatch**](DefaultApi.md#v1merchantdropsidpatch) | **PATCH** /v1/merchant/drops/{id} | 
[**v1MerchantDropsPost**](DefaultApi.md#v1merchantdropspost) | **POST** /v1/merchant/drops | 
[**v1MerchantEventInvitePost**](DefaultApi.md#v1merchanteventinvitepost) | **POST** /v1/merchant/event-invite | 
[**v1MerchantFoundingCirclePost**](DefaultApi.md#v1merchantfoundingcirclepost) | **POST** /v1/merchant/founding-circle | 
[**v1MerchantLadderEstimateGet**](DefaultApi.md#v1merchantladderestimateget) | **GET** /v1/merchant/ladder/estimate | 
[**v1MerchantLadderGet**](DefaultApi.md#v1merchantladderget) | **GET** /v1/merchant/ladder | 
[**v1MerchantLadderPut**](DefaultApi.md#v1merchantladderput) | **PUT** /v1/merchant/ladder | 
[**v1MerchantMeGet**](DefaultApi.md#v1merchantmeget) | **GET** /v1/merchant/me | 
[**v1MerchantMeVenuesGet**](DefaultApi.md#v1merchantmevenuesget) | **GET** /v1/merchant/me/venues | 
[**v1MerchantMeVenuesVenueIdPatch**](DefaultApi.md#v1merchantmevenuesvenueidpatch) | **PATCH** /v1/merchant/me/venues/{venueId} | 
[**v1MerchantMeVenuesVenueIdStandingRoomsGet**](DefaultApi.md#v1merchantmevenuesvenueidstandingroomsget) | **GET** /v1/merchant/me/venues/{venueId}/standing-rooms | 
[**v1MerchantMeVenuesVenueIdStandingRoomsPost**](DefaultApi.md#v1merchantmevenuesvenueidstandingroomspost) | **POST** /v1/merchant/me/venues/{venueId}/standing-rooms | 
[**v1MerchantMembersExportGet**](DefaultApi.md#v1merchantmembersexportget) | **GET** /v1/merchant/members/export | 
[**v1MerchantMembersGet**](DefaultApi.md#v1merchantmembersget) | **GET** /v1/merchant/members | 
[**v1MerchantPromoPost**](DefaultApi.md#v1merchantpromopost) | **POST** /v1/merchant/promo | 
[**v1MerchantScanCouponPost**](DefaultApi.md#v1merchantscancouponpost) | **POST** /v1/merchant/scan/coupon | 
[**v1MerchantScanPost**](DefaultApi.md#v1merchantscanpost) | **POST** /v1/merchant/scan | 
[**v1MerchantSeatChargesIdDisputePost**](DefaultApi.md#v1merchantseatchargesiddisputepost) | **POST** /v1/merchant/seat-charges/{id}/dispute | 
[**v1MerchantsIdMuteDelete**](DefaultApi.md#v1merchantsidmutedelete) | **DELETE** /v1/merchants/{id}/mute | 
[**v1MerchantsIdMutePost**](DefaultApi.md#v1merchantsidmutepost) | **POST** /v1/merchants/{id}/mute | 
[**v1MetaAttributionsGet**](DefaultApi.md#v1metaattributionsget) | **GET** /v1/meta/attributions | 
[**v1PeopleYouMetSpotIdGet**](DefaultApi.md#v1peopleyoumetspotidget) | **GET** /v1/people-you-met/{spotId} | 
[**v1PokesIncomingGet**](DefaultApi.md#v1pokesincomingget) | **GET** /v1/pokes/incoming | 
[**v1PokesPost**](DefaultApi.md#v1pokespost) | **POST** /v1/pokes | 
[**v1PublicSpotShareGet**](DefaultApi.md#v1publicspotshareget) | **GET** /v1/public/spot-share | 
[**v1RebooksIdFinalizePost**](DefaultApi.md#v1rebooksidfinalizepost) | **POST** /v1/rebooks/{id}/finalize | 
[**v1RebooksIdVotePost**](DefaultApi.md#v1rebooksidvotepost) | **POST** /v1/rebooks/{id}/vote | 
[**v1ReportsPost**](DefaultApi.md#v1reportspost) | **POST** /v1/reports | 
[**v1RoomsGet**](DefaultApi.md#v1roomsget) | **GET** /v1/rooms | 
[**v1RoomsIdJoinPost**](DefaultApi.md#v1roomsidjoinpost) | **POST** /v1/rooms/{id}/join | 
[**v1RoomsIdLeavePost**](DefaultApi.md#v1roomsidleavepost) | **POST** /v1/rooms/{id}/leave | 
[**v1RoomsIdMembersGet**](DefaultApi.md#v1roomsidmembersget) | **GET** /v1/rooms/{id}/members | 
[**v1RoomsIdMessagesGet**](DefaultApi.md#v1roomsidmessagesget) | **GET** /v1/rooms/{id}/messages | 
[**v1SpotsEventsPost**](DefaultApi.md#v1spotseventspost) | **POST** /v1/spots/events | 
[**v1SpotsIdApplyPost**](DefaultApi.md#v1spotsidapplypost) | **POST** /v1/spots/{id}/apply | 
[**v1SpotsIdBailPost**](DefaultApi.md#v1spotsidbailpost) | **POST** /v1/spots/{id}/bail | 
[**v1SpotsIdCancelPost**](DefaultApi.md#v1spotsidcancelpost) | **POST** /v1/spots/{id}/cancel | 
[**v1SpotsIdConfirmPost**](DefaultApi.md#v1spotsidconfirmpost) | **POST** /v1/spots/{id}/confirm | 
[**v1SpotsIdCrewPost**](DefaultApi.md#v1spotsidcrewpost) | **POST** /v1/spots/{id}/crew | 
[**v1SpotsIdFinalisePost**](DefaultApi.md#v1spotsidfinalisepost) | **POST** /v1/spots/{id}/finalise | 
[**v1SpotsIdForgivenessPost**](DefaultApi.md#v1spotsidforgivenesspost) | **POST** /v1/spots/{id}/forgiveness | 
[**v1SpotsIdGet**](DefaultApi.md#v1spotsidget) | **GET** /v1/spots/{id} | 
[**v1SpotsIdGroupDropPost**](DefaultApi.md#v1spotsidgroupdroppost) | **POST** /v1/spots/{id}/group-drop | 
[**v1SpotsIdImHerePost**](DefaultApi.md#v1spotsidimherepost) | **POST** /v1/spots/{id}/im-here | 
[**v1SpotsIdJoinPost**](DefaultApi.md#v1spotsidjoinpost) | **POST** /v1/spots/{id}/join | 
[**v1SpotsIdLeavePost**](DefaultApi.md#v1spotsidleavepost) | **POST** /v1/spots/{id}/leave | 
[**v1SpotsIdQueueGet**](DefaultApi.md#v1spotsidqueueget) | **GET** /v1/spots/{id}/queue | 
[**v1SpotsIdRemoveMemberPost**](DefaultApi.md#v1spotsidremovememberpost) | **POST** /v1/spots/{id}/remove-member | 
[**v1SpotsIdReportAbsentPost**](DefaultApi.md#v1spotsidreportabsentpost) | **POST** /v1/spots/{id}/report-absent | 
[**v1SpotsIdRollCallGet**](DefaultApi.md#v1spotsidrollcallget) | **GET** /v1/spots/{id}/roll-call | 
[**v1SpotsIdRollCallPost**](DefaultApi.md#v1spotsidrollcallpost) | **POST** /v1/spots/{id}/roll-call | 
[**v1SpotsIdSafetyRatingPost**](DefaultApi.md#v1spotsidsafetyratingpost) | **POST** /v1/spots/{id}/safety-rating | 
[**v1SpotsIdSchedulePost**](DefaultApi.md#v1spotsidschedulepost) | **POST** /v1/spots/{id}/schedule | 
[**v1SpotsIdShareGet**](DefaultApi.md#v1spotsidshareget) | **GET** /v1/spots/{id}/share | 
[**v1SpotsIdShareMySpotPost**](DefaultApi.md#v1spotsidsharemyspotpost) | **POST** /v1/spots/{id}/share-my-spot | 
[**v1SpotsPost**](DefaultApi.md#v1spotspost) | **POST** /v1/spots | 
[**v1VenuesIdDropsGet**](DefaultApi.md#v1venuesiddropsget) | **GET** /v1/venues/{id}/drops | 
[**v1VenuesIdGet**](DefaultApi.md#v1venuesidget) | **GET** /v1/venues/{id} | 
[**v1VenuesIdMembershipDelete**](DefaultApi.md#v1venuesidmembershipdelete) | **DELETE** /v1/venues/{id}/membership | 
[**v1VenuesIdMembershipPost**](DefaultApi.md#v1venuesidmembershippost) | **POST** /v1/venues/{id}/membership | 
[**v1VenuesIdReportPost**](DefaultApi.md#v1venuesidreportpost) | **POST** /v1/venues/{id}/report | 
[**v1VenuesIdSaveDelete**](DefaultApi.md#v1venuesidsavedelete) | **DELETE** /v1/venues/{id}/save | 
[**v1VenuesIdSavePost**](DefaultApi.md#v1venuesidsavepost) | **POST** /v1/venues/{id}/save | 
[**v1VenuesPost**](DefaultApi.md#v1venuespost) | **POST** /v1/venues | 
[**v1VenuesSearchGet**](DefaultApi.md#v1venuessearchget) | **GET** /v1/venues/search | 
[**v1WaitlistPost**](DefaultApi.md#v1waitlistpost) | **POST** /v1/waitlist | 
[**v1WebhooksRevenuecatPost**](DefaultApi.md#v1webhooksrevenuecatpost) | **POST** /v1/webhooks/revenuecat | 
[**v1WebhooksStripeConsumerPost**](DefaultApi.md#v1webhooksstripeconsumerpost) | **POST** /v1/webhooks/stripe-consumer | 
[**v1WebhooksStripePost**](DefaultApi.md#v1webhooksstripepost) | **POST** /v1/webhooks/stripe | 


# **v1AdminFinanceOverviewGet**
> v1AdminFinanceOverviewGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminFinanceOverviewGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminFinanceOverviewGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminMerchantClaimsGet**
> v1AdminMerchantClaimsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminMerchantClaimsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminMerchantClaimsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminMerchantClaimsIdPost**
> v1AdminMerchantClaimsIdPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1AdminMerchantClaimsIdPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminMerchantClaimsIdPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminMerchantFinanceBandAuditGet**
> v1AdminMerchantFinanceBandAuditGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminMerchantFinanceBandAuditGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminMerchantFinanceBandAuditGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminMerchantFinanceBandAuditVenueIdPost**
> v1AdminMerchantFinanceBandAuditVenueIdPost(venueId, v1AdminMerchantFinanceBandAuditVenueIdPostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String venueId = venueId_example; // String | 
final V1AdminMerchantFinanceBandAuditVenueIdPostRequest v1AdminMerchantFinanceBandAuditVenueIdPostRequest = ; // V1AdminMerchantFinanceBandAuditVenueIdPostRequest | 

try {
    api.v1AdminMerchantFinanceBandAuditVenueIdPost(venueId, v1AdminMerchantFinanceBandAuditVenueIdPostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminMerchantFinanceBandAuditVenueIdPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **venueId** | **String**|  | 
 **v1AdminMerchantFinanceBandAuditVenueIdPostRequest** | [**V1AdminMerchantFinanceBandAuditVenueIdPostRequest**](V1AdminMerchantFinanceBandAuditVenueIdPostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminMerchantFinanceDisputesGet**
> v1AdminMerchantFinanceDisputesGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminMerchantFinanceDisputesGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminMerchantFinanceDisputesGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminMerchantFinanceDisputesIdResolvePost**
> v1AdminMerchantFinanceDisputesIdResolvePost(id, v1AdminMerchantFinanceDisputesIdResolvePostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 
final V1AdminMerchantFinanceDisputesIdResolvePostRequest v1AdminMerchantFinanceDisputesIdResolvePostRequest = ; // V1AdminMerchantFinanceDisputesIdResolvePostRequest | 

try {
    api.v1AdminMerchantFinanceDisputesIdResolvePost(id, v1AdminMerchantFinanceDisputesIdResolvePostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminMerchantFinanceDisputesIdResolvePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **v1AdminMerchantFinanceDisputesIdResolvePostRequest** | [**V1AdminMerchantFinanceDisputesIdResolvePostRequest**](V1AdminMerchantFinanceDisputesIdResolvePostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminMerchantFinanceFoundingGet**
> v1AdminMerchantFinanceFoundingGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminMerchantFinanceFoundingGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminMerchantFinanceFoundingGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminMerchantFinanceHealthGet**
> v1AdminMerchantFinanceHealthGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminMerchantFinanceHealthGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminMerchantFinanceHealthGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminMerchantFinanceVenuesIdLedgerGet**
> v1AdminMerchantFinanceVenuesIdLedgerGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1AdminMerchantFinanceVenuesIdLedgerGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminMerchantFinanceVenuesIdLedgerGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminMetricsGet**
> v1AdminMetricsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminMetricsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminMetricsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminModerationQueueGet**
> v1AdminModerationQueueGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminModerationQueueGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminModerationQueueGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminModerationUserIdActionPost**
> v1AdminModerationUserIdActionPost(userId)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String userId = userId_example; // String | 

try {
    api.v1AdminModerationUserIdActionPost(userId);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminModerationUserIdActionPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **userId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminReportsIdResolvePost**
> v1AdminReportsIdResolvePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1AdminReportsIdResolvePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminReportsIdResolvePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminUsersGet**
> v1AdminUsersGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminUsersGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminUsersGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminUsersIdGet**
> v1AdminUsersIdGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1AdminUsersIdGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminUsersIdGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminUsersIdModeratePost**
> v1AdminUsersIdModeratePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1AdminUsersIdModeratePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminUsersIdModeratePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminVenueReportsGet**
> v1AdminVenueReportsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminVenueReportsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminVenueReportsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminVenueReportsIdResolvePost**
> v1AdminVenueReportsIdResolvePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1AdminVenueReportsIdResolvePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminVenueReportsIdResolvePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminVenuesGeocodeFailedGet**
> v1AdminVenuesGeocodeFailedGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminVenuesGeocodeFailedGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminVenuesGeocodeFailedGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminVenuesIdPinPost**
> v1AdminVenuesIdPinPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1AdminVenuesIdPinPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminVenuesIdPinPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminVenuesMergePost**
> v1AdminVenuesMergePost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminVenuesMergePost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminVenuesMergePost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1AdminWaitlistGet**
> v1AdminWaitlistGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1AdminWaitlistGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1AdminWaitlistGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ApplicationsIdDecisionPost**
> v1ApplicationsIdDecisionPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1ApplicationsIdDecisionPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1ApplicationsIdDecisionPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1BillingCheckoutPost**
> v1BillingCheckoutPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1BillingCheckoutPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1BillingCheckoutPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1BillingPortalPost**
> v1BillingPortalPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1BillingPortalPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1BillingPortalPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1BlocksUserIdDelete**
> v1BlocksUserIdDelete(userId)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String userId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.v1BlocksUserIdDelete(userId);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1BlocksUserIdDelete: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **userId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1BlocksUserIdPost**
> v1BlocksUserIdPost(userId)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String userId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.v1BlocksUserIdPost(userId);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1BlocksUserIdPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **userId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ConnectionsGet**
> v1ConnectionsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1ConnectionsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1ConnectionsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ConnectionsIdDisconnectPost**
> v1ConnectionsIdDisconnectPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1ConnectionsIdDisconnectPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1ConnectionsIdDisconnectPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1CrewsGet**
> v1CrewsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1CrewsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1CrewsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1CrewsIdLeavePost**
> v1CrewsIdLeavePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1CrewsIdLeavePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1CrewsIdLeavePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1CrewsIdPatch**
> v1CrewsIdPatch(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1CrewsIdPatch(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1CrewsIdPatch: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1CrewsIdRebookPost**
> v1CrewsIdRebookPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1CrewsIdRebookPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1CrewsIdRebookPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1CrewsIdRebooksGet**
> v1CrewsIdRebooksGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1CrewsIdRebooksGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1CrewsIdRebooksGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1DistrictsGet**
> v1DistrictsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1DistrictsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1DistrictsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1DistrictsIdSpotsGet**
> v1DistrictsIdSpotsGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1DistrictsIdSpotsGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1DistrictsIdSpotsGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1DropsIdClaimPost**
> v1DropsIdClaimPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1DropsIdClaimPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1DropsIdClaimPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1HealthGet**
> V1HealthGet200Response v1HealthGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    final response = api.v1HealthGet();
    print(response);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1HealthGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**V1HealthGet200Response**](V1HealthGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1InternalAutomationBirthdayPost**
> v1InternalAutomationBirthdayPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1InternalAutomationBirthdayPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1InternalAutomationBirthdayPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1InternalAutomationWinbackPost**
> v1InternalAutomationWinbackPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1InternalAutomationWinbackPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1InternalAutomationWinbackPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1InternalCouponCheckPost**
> v1InternalCouponCheckPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1InternalCouponCheckPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1InternalCouponCheckPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1InternalCrewSweepPost**
> v1InternalCrewSweepPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1InternalCrewSweepPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1InternalCrewSweepPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1InternalEnforcementUserIdGet**
> v1InternalEnforcementUserIdGet(userId)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String userId = userId_example; // String | 

try {
    api.v1InternalEnforcementUserIdGet(userId);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1InternalEnforcementUserIdGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **userId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1InternalMembershipSweepPost**
> v1InternalMembershipSweepPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1InternalMembershipSweepPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1InternalMembershipSweepPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1InternalMerchantInvoiceRunPost**
> v1InternalMerchantInvoiceRunPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1InternalMerchantInvoiceRunPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1InternalMerchantInvoiceRunPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1InternalPokeExpiryPost**
> v1InternalPokeExpiryPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1InternalPokeExpiryPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1InternalPokeExpiryPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1InternalScoreRecomputePost**
> v1InternalScoreRecomputePost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1InternalScoreRecomputePost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1InternalScoreRecomputePost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1InternalSpotSweepPost**
> v1InternalSpotSweepPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1InternalSpotSweepPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1InternalSpotSweepPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MapViewportGet**
> v1MapViewportGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MapViewportGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MapViewportGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeActivityGet**
> v1MeActivityGet(cursor, limit)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String cursor = cursor_example; // String | 
final int limit = 56; // int | 

try {
    api.v1MeActivityGet(cursor, limit);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeActivityGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**|  | [optional] 
 **limit** | **int**|  | [optional] 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeActivityReadPost**
> v1MeActivityReadPost(v1MeActivityReadPostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1MeActivityReadPostRequest v1MeActivityReadPostRequest = ; // V1MeActivityReadPostRequest | 

try {
    api.v1MeActivityReadPost(v1MeActivityReadPostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeActivityReadPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1MeActivityReadPostRequest** | [**V1MeActivityReadPostRequest**](V1MeActivityReadPostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeCapsGet**
> v1MeCapsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeCapsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeCapsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeCouponsGet**
> v1MeCouponsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeCouponsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeCouponsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeDelete**
> v1MeDelete()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeDelete();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeDelete: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeExportGet**
> v1MeExportGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeExportGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeExportGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeGet**
> v1MeGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeHostedGet**
> v1MeHostedGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeHostedGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeHostedGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeKeywordsGet**
> v1MeKeywordsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeKeywordsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeKeywordsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeKeywordsPut**
> v1MeKeywordsPut()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeKeywordsPut();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeKeywordsPut: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeLocationPingPost**
> v1MeLocationPingPost(v1MeLocationPingPostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1MeLocationPingPostRequest v1MeLocationPingPostRequest = ; // V1MeLocationPingPostRequest | 

try {
    api.v1MeLocationPingPost(v1MeLocationPingPostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeLocationPingPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1MeLocationPingPostRequest** | [**V1MeLocationPingPostRequest**](V1MeLocationPingPostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeMembershipsGet**
> v1MeMembershipsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeMembershipsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeMembershipsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeNotificationPrefsGet**
> v1MeNotificationPrefsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeNotificationPrefsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeNotificationPrefsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeNotificationPrefsPatch**
> v1MeNotificationPrefsPatch(v1MeNotificationPrefsPatchRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1MeNotificationPrefsPatchRequest v1MeNotificationPrefsPatchRequest = ; // V1MeNotificationPrefsPatchRequest | 

try {
    api.v1MeNotificationPrefsPatch(v1MeNotificationPrefsPatchRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeNotificationPrefsPatch: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1MeNotificationPrefsPatchRequest** | [**V1MeNotificationPrefsPatchRequest**](V1MeNotificationPrefsPatchRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeOnboardPost**
> v1MeOnboardPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeOnboardPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeOnboardPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MePatch**
> v1MePatch()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MePatch();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MePatch: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MePhoneConfirmPost**
> v1MePhoneConfirmPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MePhoneConfirmPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MePhoneConfirmPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MePhoneOtpPost**
> v1MePhoneOtpPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MePhoneOtpPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MePhoneOtpPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MePokeBalanceGet**
> v1MePokeBalanceGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MePokeBalanceGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MePokeBalanceGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MePushTokensPost**
> v1MePushTokensPost(v1MePushTokensPostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1MePushTokensPostRequest v1MePushTokensPostRequest = ; // V1MePushTokensPostRequest | 

try {
    api.v1MePushTokensPost(v1MePushTokensPostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MePushTokensPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1MePushTokensPostRequest** | [**V1MePushTokensPostRequest**](V1MePushTokensPostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeQrGet**
> v1MeQrGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeQrGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeQrGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeReferralsGet**
> v1MeReferralsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeReferralsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeReferralsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeSpotsAttendedGet**
> v1MeSpotsAttendedGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeSpotsAttendedGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeSpotsAttendedGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeWalletDropsGet**
> v1MeWalletDropsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MeWalletDropsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MeWalletDropsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantBillingCancelPost**
> v1MerchantBillingCancelPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantBillingCancelPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantBillingCancelPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantBillingInvoicesGet**
> v1MerchantBillingInvoicesGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantBillingInvoicesGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantBillingInvoicesGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantBillingSeatChargesGet**
> v1MerchantBillingSeatChargesGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantBillingSeatChargesGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantBillingSeatChargesGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantBillingSetupIntentPost**
> v1MerchantBillingSetupIntentPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantBillingSetupIntentPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantBillingSetupIntentPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantBillingSubscribePost**
> v1MerchantBillingSubscribePost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantBillingSubscribePost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantBillingSubscribePost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantClaimPost**
> v1MerchantClaimPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantClaimPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantClaimPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantClaimPresignPost**
> v1MerchantClaimPresignPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantClaimPresignPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantClaimPresignPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantCouponsIssuePost**
> v1MerchantCouponsIssuePost(v1MerchantCouponsIssuePostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1MerchantCouponsIssuePostRequest v1MerchantCouponsIssuePostRequest = ; // V1MerchantCouponsIssuePostRequest | 

try {
    api.v1MerchantCouponsIssuePost(v1MerchantCouponsIssuePostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantCouponsIssuePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1MerchantCouponsIssuePostRequest** | [**V1MerchantCouponsIssuePostRequest**](V1MerchantCouponsIssuePostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantDropsIdCostEstimateGet**
> v1MerchantDropsIdCostEstimateGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.v1MerchantDropsIdCostEstimateGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantDropsIdCostEstimateGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantDropsIdPatch**
> v1MerchantDropsIdPatch(id, v1MerchantDropsIdPatchRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final V1MerchantDropsIdPatchRequest v1MerchantDropsIdPatchRequest = ; // V1MerchantDropsIdPatchRequest | 

try {
    api.v1MerchantDropsIdPatch(id, v1MerchantDropsIdPatchRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantDropsIdPatch: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **v1MerchantDropsIdPatchRequest** | [**V1MerchantDropsIdPatchRequest**](V1MerchantDropsIdPatchRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantDropsPost**
> v1MerchantDropsPost(v1MerchantDropsPostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1MerchantDropsPostRequest v1MerchantDropsPostRequest = ; // V1MerchantDropsPostRequest | 

try {
    api.v1MerchantDropsPost(v1MerchantDropsPostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantDropsPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1MerchantDropsPostRequest** | [**V1MerchantDropsPostRequest**](V1MerchantDropsPostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantEventInvitePost**
> v1MerchantEventInvitePost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantEventInvitePost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantEventInvitePost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantFoundingCirclePost**
> v1MerchantFoundingCirclePost(v1MerchantFoundingCirclePostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1MerchantFoundingCirclePostRequest v1MerchantFoundingCirclePostRequest = ; // V1MerchantFoundingCirclePostRequest | 

try {
    api.v1MerchantFoundingCirclePost(v1MerchantFoundingCirclePostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantFoundingCirclePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1MerchantFoundingCirclePostRequest** | [**V1MerchantFoundingCirclePostRequest**](V1MerchantFoundingCirclePostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantLadderEstimateGet**
> v1MerchantLadderEstimateGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantLadderEstimateGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantLadderEstimateGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantLadderGet**
> v1MerchantLadderGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantLadderGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantLadderGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantLadderPut**
> v1MerchantLadderPut(v1MerchantLadderPutRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1MerchantLadderPutRequest v1MerchantLadderPutRequest = ; // V1MerchantLadderPutRequest | 

try {
    api.v1MerchantLadderPut(v1MerchantLadderPutRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantLadderPut: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1MerchantLadderPutRequest** | [**V1MerchantLadderPutRequest**](V1MerchantLadderPutRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantMeGet**
> v1MerchantMeGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantMeGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantMeGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantMeVenuesGet**
> v1MerchantMeVenuesGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantMeVenuesGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantMeVenuesGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantMeVenuesVenueIdPatch**
> v1MerchantMeVenuesVenueIdPatch(venueId)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String venueId = venueId_example; // String | 

try {
    api.v1MerchantMeVenuesVenueIdPatch(venueId);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantMeVenuesVenueIdPatch: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **venueId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantMeVenuesVenueIdStandingRoomsGet**
> v1MerchantMeVenuesVenueIdStandingRoomsGet(venueId)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String venueId = venueId_example; // String | 

try {
    api.v1MerchantMeVenuesVenueIdStandingRoomsGet(venueId);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantMeVenuesVenueIdStandingRoomsGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **venueId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantMeVenuesVenueIdStandingRoomsPost**
> v1MerchantMeVenuesVenueIdStandingRoomsPost(venueId)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String venueId = venueId_example; // String | 

try {
    api.v1MerchantMeVenuesVenueIdStandingRoomsPost(venueId);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantMeVenuesVenueIdStandingRoomsPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **venueId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantMembersExportGet**
> v1MerchantMembersExportGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantMembersExportGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantMembersExportGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantMembersGet**
> v1MerchantMembersGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantMembersGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantMembersGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantPromoPost**
> v1MerchantPromoPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MerchantPromoPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantPromoPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantScanCouponPost**
> v1MerchantScanCouponPost(v1MerchantScanCouponPostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1MerchantScanCouponPostRequest v1MerchantScanCouponPostRequest = ; // V1MerchantScanCouponPostRequest | 

try {
    api.v1MerchantScanCouponPost(v1MerchantScanCouponPostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantScanCouponPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1MerchantScanCouponPostRequest** | [**V1MerchantScanCouponPostRequest**](V1MerchantScanCouponPostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantScanPost**
> v1MerchantScanPost(v1MerchantScanPostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1MerchantScanPostRequest v1MerchantScanPostRequest = ; // V1MerchantScanPostRequest | 

try {
    api.v1MerchantScanPost(v1MerchantScanPostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantScanPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1MerchantScanPostRequest** | [**V1MerchantScanPostRequest**](V1MerchantScanPostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantSeatChargesIdDisputePost**
> v1MerchantSeatChargesIdDisputePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1MerchantSeatChargesIdDisputePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantSeatChargesIdDisputePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantsIdMuteDelete**
> v1MerchantsIdMuteDelete(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.v1MerchantsIdMuteDelete(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantsIdMuteDelete: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MerchantsIdMutePost**
> v1MerchantsIdMutePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.v1MerchantsIdMutePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MerchantsIdMutePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MetaAttributionsGet**
> v1MetaAttributionsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1MetaAttributionsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1MetaAttributionsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1PeopleYouMetSpotIdGet**
> v1PeopleYouMetSpotIdGet(spotId)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String spotId = spotId_example; // String | 

try {
    api.v1PeopleYouMetSpotIdGet(spotId);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1PeopleYouMetSpotIdGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **spotId** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1PokesIncomingGet**
> v1PokesIncomingGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1PokesIncomingGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1PokesIncomingGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1PokesPost**
> v1PokesPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1PokesPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1PokesPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1PublicSpotShareGet**
> v1PublicSpotShareGet(spot, sig)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String spot = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String sig = sig_example; // String | 

try {
    api.v1PublicSpotShareGet(spot, sig);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1PublicSpotShareGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **spot** | **String**|  | 
 **sig** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1RebooksIdFinalizePost**
> v1RebooksIdFinalizePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1RebooksIdFinalizePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1RebooksIdFinalizePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1RebooksIdVotePost**
> v1RebooksIdVotePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1RebooksIdVotePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1RebooksIdVotePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ReportsPost**
> v1ReportsPost(v1ReportsPostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final V1ReportsPostRequest v1ReportsPostRequest = ; // V1ReportsPostRequest | 

try {
    api.v1ReportsPost(v1ReportsPostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1ReportsPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v1ReportsPostRequest** | [**V1ReportsPostRequest**](V1ReportsPostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1RoomsGet**
> v1RoomsGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1RoomsGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1RoomsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1RoomsIdJoinPost**
> v1RoomsIdJoinPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1RoomsIdJoinPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1RoomsIdJoinPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1RoomsIdLeavePost**
> v1RoomsIdLeavePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1RoomsIdLeavePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1RoomsIdLeavePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1RoomsIdMembersGet**
> v1RoomsIdMembersGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1RoomsIdMembersGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1RoomsIdMembersGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1RoomsIdMessagesGet**
> v1RoomsIdMessagesGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1RoomsIdMessagesGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1RoomsIdMessagesGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsEventsPost**
> v1SpotsEventsPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1SpotsEventsPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsEventsPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdApplyPost**
> v1SpotsIdApplyPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdApplyPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdApplyPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdBailPost**
> v1SpotsIdBailPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdBailPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdBailPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdCancelPost**
> v1SpotsIdCancelPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdCancelPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdCancelPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdConfirmPost**
> v1SpotsIdConfirmPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdConfirmPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdConfirmPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdCrewPost**
> v1SpotsIdCrewPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdCrewPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdCrewPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdFinalisePost**
> v1SpotsIdFinalisePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdFinalisePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdFinalisePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdForgivenessPost**
> v1SpotsIdForgivenessPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdForgivenessPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdForgivenessPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdGet**
> v1SpotsIdGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdGroupDropPost**
> v1SpotsIdGroupDropPost(id, v1SpotsIdGroupDropPostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final V1SpotsIdGroupDropPostRequest v1SpotsIdGroupDropPostRequest = ; // V1SpotsIdGroupDropPostRequest | 

try {
    api.v1SpotsIdGroupDropPost(id, v1SpotsIdGroupDropPostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdGroupDropPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **v1SpotsIdGroupDropPostRequest** | [**V1SpotsIdGroupDropPostRequest**](V1SpotsIdGroupDropPostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdImHerePost**
> v1SpotsIdImHerePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdImHerePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdImHerePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdJoinPost**
> v1SpotsIdJoinPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdJoinPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdJoinPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdLeavePost**
> v1SpotsIdLeavePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdLeavePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdLeavePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdQueueGet**
> v1SpotsIdQueueGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdQueueGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdQueueGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdRemoveMemberPost**
> v1SpotsIdRemoveMemberPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdRemoveMemberPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdRemoveMemberPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdReportAbsentPost**
> v1SpotsIdReportAbsentPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdReportAbsentPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdReportAbsentPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdRollCallGet**
> v1SpotsIdRollCallGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdRollCallGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdRollCallGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdRollCallPost**
> v1SpotsIdRollCallPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdRollCallPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdRollCallPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdSafetyRatingPost**
> v1SpotsIdSafetyRatingPost(id, v1SpotsIdSafetyRatingPostRequest)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final V1SpotsIdSafetyRatingPostRequest v1SpotsIdSafetyRatingPostRequest = ; // V1SpotsIdSafetyRatingPostRequest | 

try {
    api.v1SpotsIdSafetyRatingPost(id, v1SpotsIdSafetyRatingPostRequest);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdSafetyRatingPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **v1SpotsIdSafetyRatingPostRequest** | [**V1SpotsIdSafetyRatingPostRequest**](V1SpotsIdSafetyRatingPostRequest.md)|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdSchedulePost**
> v1SpotsIdSchedulePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdSchedulePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdSchedulePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdShareGet**
> v1SpotsIdShareGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1SpotsIdShareGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdShareGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsIdShareMySpotPost**
> v1SpotsIdShareMySpotPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.v1SpotsIdShareMySpotPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsIdShareMySpotPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1SpotsPost**
> v1SpotsPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1SpotsPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1SpotsPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1VenuesIdDropsGet**
> v1VenuesIdDropsGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.v1VenuesIdDropsGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1VenuesIdDropsGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1VenuesIdGet**
> v1VenuesIdGet(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1VenuesIdGet(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1VenuesIdGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1VenuesIdMembershipDelete**
> v1VenuesIdMembershipDelete(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1VenuesIdMembershipDelete(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1VenuesIdMembershipDelete: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1VenuesIdMembershipPost**
> v1VenuesIdMembershipPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1VenuesIdMembershipPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1VenuesIdMembershipPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1VenuesIdReportPost**
> v1VenuesIdReportPost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1VenuesIdReportPost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1VenuesIdReportPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1VenuesIdSaveDelete**
> v1VenuesIdSaveDelete(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1VenuesIdSaveDelete(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1VenuesIdSaveDelete: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1VenuesIdSavePost**
> v1VenuesIdSavePost(id)



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();
final String id = id_example; // String | 

try {
    api.v1VenuesIdSavePost(id);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1VenuesIdSavePost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1VenuesPost**
> v1VenuesPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1VenuesPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1VenuesPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1VenuesSearchGet**
> v1VenuesSearchGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1VenuesSearchGet();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1VenuesSearchGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1WaitlistPost**
> v1WaitlistPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1WaitlistPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1WaitlistPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1WebhooksRevenuecatPost**
> v1WebhooksRevenuecatPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1WebhooksRevenuecatPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1WebhooksRevenuecatPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1WebhooksStripeConsumerPost**
> v1WebhooksStripeConsumerPost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1WebhooksStripeConsumerPost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1WebhooksStripeConsumerPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1WebhooksStripePost**
> v1WebhooksStripePost()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    api.v1WebhooksStripePost();
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1WebhooksStripePost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

