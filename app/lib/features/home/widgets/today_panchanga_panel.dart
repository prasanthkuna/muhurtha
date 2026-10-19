import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

class TodayPanchangaPanel extends StatelessWidget {
  const TodayPanchangaPanel({
    super.key,
    required this.locationVerified,
    required this.locationLabel,
    required this.panchanga,
    required this.onSetLocation,
  });
  final bool locationVerified;
  final String locationLabel;
  final Map<String, dynamic>? panchanga;
  final VoidCallback onSetLocation;

  String value(String key,String field) {
    final raw = panchanga?[key];
    return raw is Map ? (raw[field]?.toString() ?? '') : '';
  }
  String change(String key) {
    final raw=value(key,'nextChange');
    return raw.length >= 16 ? raw.substring(11,16) : '';
  }
  @override
  Widget build(BuildContext context) {
    final text=Theme.of(context).textTheme;
    if (!locationVerified || panchanga==null) {
      return Container(
        padding:const EdgeInsets.all(MuhSpace.lg),
        decoration:BoxDecoration(color:MuhColors.warningWash,borderRadius:BorderRadius.circular(MuhRadius.card)),
        child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          Text('Confirm your current city',style:text.titleMedium),
          const SizedBox(height:MuhSpace.sm),
          Text('Your reading remains available. Exact clock times require a resolved city and timezone.',style:text.bodyMedium),
          const SizedBox(height:MuhSpace.sm),
          MuhQuietButton(label:'Set current city',icon:Icons.place_outlined,onPressed:onSetLocation),
        ]),
      );
    }
    const fields=['tithi','nakshatra','yoga','karana','vara'];
    return Container(
      padding:const EdgeInsets.all(MuhSpace.lg),
      decoration:BoxDecoration(color:MuhColors.paper,border:Border.all(color:MuhColors.line),
        borderRadius:BorderRadius.circular(MuhRadius.card)),
      child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
        Text('YOUR TRADITIONAL CALENDAR',style:text.labelLarge?.copyWith(color:MuhColors.goldDeep)),
        const SizedBox(height:MuhSpace.xs),
        Text('What changes today',style:text.headlineSmall),
        Text(locationLabel + ' · Sunrise-based',style:text.bodySmall),
        const SizedBox(height:MuhSpace.md),
        for(final key in fields)...[
          Row(children:[
            Expanded(child:Text(value(key,'name'),style:text.labelLarge)),
            Expanded(flex:2,child:Text(value(key,'value'),style:text.bodyMedium,textAlign:TextAlign.end)),
          ]),
          if(change(key).isNotEmpty)
            Align(alignment:Alignment.centerRight,
              child:Text('Changes around ' + change(key),style:text.bodySmall)),
          const Divider(height:22,color:MuhColors.line),
        ],
        if(value('tarabala','value').isNotEmpty)
          Text('Tarabala · ' + value('tarabala','value'),style:text.bodyMedium),
        if(value('chandrabala','value').isNotEmpty)
          Text('Chandrabala · ' + value('chandrabala','value'),style:text.bodyMedium),
        const SizedBox(height:MuhSpace.sm),
        Text('Calculated calendar facts; interpretations are traditional, not guaranteed outcomes.',style:text.bodySmall),
        Material(
          color: MuhColors.paper,
          child: ExpansionTile(tilePadding:EdgeInsets.zero,title:const Text('Method & limitations'),children:[
          for(final item in (panchanga?['limitations'] as List? ?? const []))
            Padding(padding:const EdgeInsets.only(bottom:MuhSpace.sm),
              child:Text(item.toString(),style:text.bodySmall)),
          Text('Method: ' + (panchanga?['method']?.toString() ?? ''),style:text.bodySmall),
          ]),
        ),
      ]),
    );
  }
}
